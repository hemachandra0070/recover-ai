"""
Recovery Agent Orchestrator for RecoverAI.

Orchestrates the 7-step autonomous recovery pipeline:
DETECT -> GEMINI_DIAGNOSE -> DECIDE -> POLICY_CHECK -> EXECUTE -> VERIFY -> AUDIT.

Gemini AI acts in an advisory capacity.
Deterministic policy.py remains authoritative and can override AI recommendations.
Deterministic diagnosis.py acts as a robust fallback if Gemini is unavailable.
Each step persists an auditable trace in the AgentLog table.
"""

from datetime import datetime, timezone
from typing import Dict, Any
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import Session

try:
    from ..models import Payment, AgentLog
    from .gemini_agent import diagnose_with_gemini
    from .policy import validate_action
    from ..services.recovery_service import execute_recovery_action
except ImportError:
    from models import Payment, AgentLog
    from agent.gemini_agent import diagnose_with_gemini
    from agent.policy import validate_action
    from services.recovery_service import execute_recovery_action


def _log_step(
    db: Session,
    payment_id: int,
    step: str,
    decision: str,
    reasoning: str,
) -> AgentLog:
    """Helper to persist an AgentLog record."""
    log_entry = AgentLog(
        payment_id=payment_id,
        agent_step=step,
        decision=decision,
        reasoning=reasoning,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(log_entry)
    db.commit()
    db.refresh(log_entry)
    return log_entry


def run_recovery_agent(db: Session, payment: Payment) -> Dict[str, Any]:
    """
    Executes the autonomous recovery lifecycle on a failed payment transaction.

    Pipeline:
    1. DETECT: Ingests transaction state, failure code, and customer risk context.
    2. GEMINI_DIAGNOSE: Advisory AI diagnosis of failure cause and recovery probability (or fallback).
    3. DECIDE: Recommends an optimal recovery strategy.
    4. POLICY_CHECK: Authoritative validation enforcing business rules, retry limits, and anti-fraud policies.
    5. EXECUTE: Dispatches the validated action via recovery services.
    6. VERIFY: Verifies transaction outcome and state transitions.
    7. AUDIT: Compiles an immutable audit record of the recovery event.

    Returns:
        dict containing:
            - payment_id: int
            - transaction_id: str
            - diagnosis: str
            - recovery_probability: float
            - proposed_action: str
            - final_action: str
            - policy_decision: dict
            - action_result: dict
            - amount_recovered: float
            - status: str
            - is_fallback: bool
            - source: str
    """
    # -------------------------------------------------------------------------
    # 1. DETECT
    # -------------------------------------------------------------------------
    _log_step(
        db=db,
        payment_id=payment.id,
        step="DETECT",
        decision="FAILED_PAYMENT_DETECTED",
        reasoning=(
            f"Detected failed transaction {payment.transaction_id}. Amount: INR {payment.amount:,.2f}, "
            f"Method: {payment.payment_method}, Failure: {payment.failure_reason}, "
            f"Attempts: {payment.attempt_count}, Risk Score: {payment.risk_score:.1f}."
        ),
    )

    # -------------------------------------------------------------------------
    # 2. GEMINI_DIAGNOSE
    # -------------------------------------------------------------------------
    diag = diagnose_with_gemini(payment)
    diagnosis_text = diag["diagnosis"]
    recovery_prob = diag["recovery_probability"]
    is_fallback = diag.get("is_fallback", False)
    source = diag.get("source", "gemini")

    if is_fallback:
        diag_reasoning = (
            f"[FALLBACK USED: {diag.get('fallback_reason')}] "
            f"Deterministic Diagnosis: '{diagnosis_text}'. Estimated recovery probability: {recovery_prob * 100:.1f}%. "
            f"Analysis: {diag['reason']}"
        )
        diag_decision = f"{diagnosis_text} (FALLBACK)"
    else:
        diag_reasoning = (
            f"[AI Diagnosis: Gemini] Diagnosis: '{diagnosis_text}'. "
            f"Estimated recovery probability: {recovery_prob * 100:.1f}%. "
            f"Analysis: {diag['reason']}"
        )
        diag_decision = diagnosis_text

    _log_step(
        db=db,
        payment_id=payment.id,
        step="GEMINI_DIAGNOSE",
        decision=diag_decision,
        reasoning=diag_reasoning,
    )

    # -------------------------------------------------------------------------
    # 3. DECIDE
    # -------------------------------------------------------------------------
    proposed_action = diag["recommended_action"]
    _log_step(
        db=db,
        payment_id=payment.id,
        step="DECIDE",
        decision=proposed_action,
        reasoning=f"Proposed strategy '{proposed_action}' based on {source} diagnosis and estimated probability {recovery_prob:.2f}.",
    )

    # -------------------------------------------------------------------------
    # 4. POLICY_CHECK (Authoritative)
    # -------------------------------------------------------------------------
    policy_check = validate_action(payment, proposed_action)
    final_action = policy_check["final_action"]
    is_allowed = policy_check["allowed"]
    policy_reason = policy_check["reason"]

    policy_decision_str = "APPROVED" if is_allowed else f"OVERRIDDEN -> {final_action}"
    _log_step(
        db=db,
        payment_id=payment.id,
        step="POLICY_CHECK",
        decision=policy_decision_str,
        reasoning=policy_reason,
    )

    # -------------------------------------------------------------------------
    # 5. EXECUTE
    # -------------------------------------------------------------------------
    # Delegate execution to recovery service (creates RecoveryAction and EXECUTE AgentLog)
    action_result = execute_recovery_action(
        db=db,
        payment=payment,
        action=final_action,
        reason=policy_reason,
        confidence=recovery_prob,
    )

    # -------------------------------------------------------------------------
    # 6. VERIFY
    # -------------------------------------------------------------------------
    amount_recovered = action_result.get("amount_recovered", 0.0)
    current_status = payment.status
    action_success = action_result.get("success", False)

    if current_status == "RECOVERED":
        verify_reason = f"Verification successful: Payment marked as RECOVERED. Total INR {amount_recovered:,.2f} recovered."
        verify_decision = "RECOVERED"
    elif action_success:
        verify_reason = f"Verification completed: Action '{final_action}' dispatched successfully ({action_result.get('message')})."
        verify_decision = "ACTION_DISPATCHED"
    else:
        verify_reason = f"Verification note: Action '{final_action}' did not yield immediate recovery. Status remains {current_status}."
        verify_decision = "UNRECOVERED"

    _log_step(
        db=db,
        payment_id=payment.id,
        step="VERIFY",
        decision=verify_decision,
        reasoning=verify_reason,
    )

    # -------------------------------------------------------------------------
    # 7. AUDIT
    # -------------------------------------------------------------------------
    audit_summary = (
        f"Pipeline complete for {payment.transaction_id}. Diagnostic Source: {source}, "
        f"Proposed: {proposed_action}, Final: {final_action}, Status: {current_status}, "
        f"Amount Recovered: INR {amount_recovered:,.2f}."
    )
    _log_step(
        db=db,
        payment_id=payment.id,
        step="AUDIT",
        decision=f"AUDIT_COMPLETE ({current_status})",
        reasoning=audit_summary,
    )

    return {
        "payment_id": payment.id,
        "transaction_id": payment.transaction_id,
        "diagnosis": diagnosis_text,
        "recovery_probability": recovery_prob,
        "proposed_action": proposed_action,
        "final_action": final_action,
        "policy_decision": policy_check,
        "action_result": action_result,
        "amount_recovered": amount_recovered,
        "status": payment.status,
        "is_fallback": is_fallback,
        "source": source,
    }
