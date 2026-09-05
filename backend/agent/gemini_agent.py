"""
Gemini AI Diagnosis Agent for RecoverAI.

Integrates Google GenAI SDK (gemini-2.5-flash) as an advisory AI diagnosis layer.
Produces structured Pydantic recommendations while delegating enforcement
to the authoritative policy.py layer and falling back gracefully to diagnosis.py
if the API is unavailable.
"""

import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, Literal, Optional, Union
from dotenv import load_dotenv
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, Field

# Load environment variables from .env files
env_paths = [
    Path(__file__).resolve().parent.parent / ".env",
    Path.cwd() / ".env",
    Path.cwd() / "backend" / ".env",
]
for path in env_paths:
    if path.exists():
        load_dotenv(dotenv_path=path)
        break

try:
    from google import genai
    from google.genai import types
    from google.genai.errors import APIError
    GENAI_AVAILABLE = True
except ImportError:
    GENAI_AVAILABLE = False

try:
    from .diagnosis import diagnose_payment
    from ..models import Payment
    from .prompts import RECOVERY_AGENT_SYSTEM_PROMPT
except ImportError:
    try:
        from agent.diagnosis import diagnose_payment
        from models import Payment
        from agent.prompts import RECOVERY_AGENT_SYSTEM_PROMPT
    except ImportError:
        Payment = Any  # type: ignore
        RECOVERY_AGENT_SYSTEM_PROMPT = """You are RecoverAI, a payment revenue recovery diagnosis agent.

Your job is to analyze a failed payment and recommend ONE bounded recovery action.

You MUST adhere to the following recovery strategy rules:
1. NETWORK_ERROR:
   - Recommend RETRY_PAYMENT (transient failure).
   - Prefer retry when attempt_count < 3 and risk_score < 80.
2. TIMEOUT:
   - Recommend RETRY_PAYMENT.
   - Prefer retry when attempt_count < 3 and risk_score < 80.
3. INSUFFICIENT_FUNDS:
   - Recommend SEND_REMINDER.
   - Never recommend RETRY_PAYMENT automatically.
4. CHECKOUT_ABANDONED:
   - Recommend GENERATE_PAYMENT_LINK.
5. CARD_DECLINED:
   - Recommend SEND_REMINDER.
   - Do not recommend GENERATE_PAYMENT_LINK unless the payment context explicitly indicates checkout abandonment.
6. EXPIRED_CARD:
   - Recommend SEND_REMINDER or ESCALATE.
   - Do not recommend RETRY_PAYMENT.
7. HIGH RISK:
   - If risk_score >= 80, recommend ESCALATE.
   - Never recommend an automated payment action for risk_score >= 80.
8. RETRY LIMIT:
   - If attempt_count >= 3, recommend ESCALATE.
   - Never recommend RETRY_PAYMENT when attempt_count >= 3.

Core Constraints:
- Never claim a payment was recovered unless the execution layer confirms it.
- Never execute actions yourself; Gemini is advisory only.
- Never bypass merchant policy.
- Keep diagnosis and reason clear, concise, and technically accurate.
- Return only the requested structured output.

The allowed actions are:
RETRY_PAYMENT
SEND_REMINDER
GENERATE_PAYMENT_LINK
ESCALATE
NO_ACTION"""

logger = logging.getLogger("recoverai.gemini_agent")


# ---------------------------------------------------------------------------
# Pydantic Structured Output Model
# ---------------------------------------------------------------------------
class RecoveryRecommendation(BaseModel):
    """Structured recovery recommendation emitted by Gemini AI."""
    diagnosis: str = Field(
        ...,
        description="A concise explanation of why the payment transaction failed."
    )
    recovery_probability: float = Field(
        ...,
        ge=0.0,
        le=1.0,
        description="Estimated probability between 0.0 and 1.0 of successfully recovering this payment."
    )
    recommended_action: Literal[
        "RETRY_PAYMENT",
        "SEND_REMINDER",
        "GENERATE_PAYMENT_LINK",
        "ESCALATE",
        "NO_ACTION",
    ] = Field(
        ...,
        description="The single bounded recovery action recommended by AI."
    )
    reason: str = Field(
        ...,
        description="Concise technical and risk-assessed rationale for the recommended action."
    )


# ---------------------------------------------------------------------------
# System Prompt & Configuration
# ---------------------------------------------------------------------------
GEMINI_SYSTEM_INSTRUCTION = RECOVERY_AGENT_SYSTEM_PROMPT

# Default target model as specified, with available fallback options
DEFAULT_GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
MODEL_CANDIDATES = [
    DEFAULT_GEMINI_MODEL,
    "gemini-3.6-flash",
    "gemini-flash-latest",
]


def get_gemini_api_key() -> Optional[str]:
    """Retrieve the GEMINI_API_KEY from the environment."""
    return os.getenv("GEMINI_API_KEY")


def check_gemini_configured() -> bool:
    """
    Checks if Gemini SDK and API key are configured.
    Logs a clear warning if configuration is missing.
    """
    if not GENAI_AVAILABLE:
        logger.warning("google-genai package is not installed. Deterministic fallback will be used.")
        return False
    
    api_key = get_gemini_api_key()
    if not api_key or not api_key.strip():
        logger.warning(
            "GEMINI_API_KEY is missing from environment. "
            "RecoverAI will automatically use the deterministic diagnosis fallback."
        )
        return False
    
    return True


def _build_payment_prompt(payment: Union[Payment, Dict[str, Any]]) -> str:
    """Extracts payment context and constructs the diagnostic prompt for Gemini."""
    failure_reason = getattr(payment, "failure_reason", "UNKNOWN") if not isinstance(payment, dict) else payment.get("failure_reason", "UNKNOWN")
    attempt_count = getattr(payment, "attempt_count", 1) if not isinstance(payment, dict) else payment.get("attempt_count", 1)
    risk_score = getattr(payment, "risk_score", 0.0) if not isinstance(payment, dict) else payment.get("risk_score", 0.0)
    payment_method = getattr(payment, "payment_method", "UNKNOWN") if not isinstance(payment, dict) else payment.get("payment_method", "UNKNOWN")
    amount = getattr(payment, "amount", None) if not isinstance(payment, dict) else payment.get("amount")
    currency = getattr(payment, "currency", "INR") if not isinstance(payment, dict) else payment.get("currency", "INR")
    status = getattr(payment, "status", "FAILED") if not isinstance(payment, dict) else payment.get("status", "FAILED")
    
    # Extract customer type if present
    customer_type = "UNKNOWN"
    if not isinstance(payment, dict):
        if hasattr(payment, "customer") and payment.customer:
            customer_type = getattr(payment.customer, "customer_type", "REGULAR")
        else:
            customer_type = getattr(payment, "customer_type", "REGULAR")
    else:
        customer_type = payment.get("customer_type", "REGULAR")

    return f"""Analyze this failed payment transaction:
- Failure Reason: {failure_reason}
- Attempt Count: {attempt_count}
- Risk Score: {risk_score}
- Payment Method: {payment_method}
- Customer Type: {customer_type}
- Amount: {currency} {amount}
- Status: {status}
"""


def diagnose_with_gemini(
    payment: Union[Payment, Dict[str, Any]],
    client: Optional[Any] = None,
) -> Dict[str, Any]:
    """
    Executes advisory Gemini AI diagnosis for a failed payment.

    If Gemini API fails, times out, returns invalid output, or is unconfigured,
    it seamlessly falls back to the deterministic diagnosis.py module and records
    fallback metadata.

    Returns:
        dict containing:
            - diagnosis (str)
            - recovery_probability (float)
            - recommended_action (str)
            - reason (str)
            - source (str): 'gemini' or 'deterministic_fallback'
            - is_fallback (bool): True if deterministic fallback was triggered
            - fallback_reason (str or None): Rationale if fallback occurred
    """
    if not check_gemini_configured():
        fallback_result = diagnose_payment(payment)
        fallback_result["source"] = "deterministic_fallback"
        fallback_result["is_fallback"] = True
        fallback_result["fallback_reason"] = "GEMINI_API_KEY is not set or google-genai SDK unavailable."
        return fallback_result

    api_key = get_gemini_api_key()
    user_prompt = _build_payment_prompt(payment)

    last_error: Optional[Exception] = None

    # Try model candidates (primary gemini-2.5-flash, fallback to candidate models)
    models_to_try = list(dict.fromkeys(MODEL_CANDIDATES))
    for model_name in models_to_try:
        try:
            genai_client = client or genai.Client(api_key=api_key)
            response = genai_client.models.generate_content(
                model=model_name,
                contents=user_prompt,
                config=types.GenerateContentConfig(
                    system_instruction=GEMINI_SYSTEM_INSTRUCTION,
                    response_mime_type="application/json",
                    response_schema=RecoveryRecommendation,
                    temperature=0.1,
                ),
            )

            if not response or not response.text:
                raise ValueError(f"Empty response received from Gemini model {model_name}.")

            # Parse structured JSON output into Pydantic model
            rec_data = json.loads(response.text)
            validated_rec = RecoveryRecommendation(**rec_data)

            return {
                "diagnosis": validated_rec.diagnosis,
                "recovery_probability": round(float(validated_rec.recovery_probability), 4),
                "recommended_action": validated_rec.recommended_action,
                "reason": validated_rec.reason,
                "source": "gemini",
                "is_fallback": False,
                "model_used": model_name,
                "fallback_reason": None,
            }

        except Exception as e:
            last_error = e
            logger.warning(
                "Gemini diagnosis attempt with model '%s' failed: %s. Trying candidate fallback if available.",
                model_name,
                str(e),
            )
            continue

    # If all Gemini attempts failed, trigger deterministic fallback
    logger.error("All Gemini API attempts failed: %s. Engaging deterministic fallback.", last_error)
    fallback_result = diagnose_payment(payment)
    fallback_result["source"] = "deterministic_fallback"
    fallback_result["is_fallback"] = True
    fallback_result["fallback_reason"] = f"Gemini API error: {type(last_error).__name__}: {str(last_error)}"
    return fallback_result
