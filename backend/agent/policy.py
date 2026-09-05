"""
Policy validation and enforcement layer for RecoverAI.

Enforces strict business rules, fraud risk thresholds, retry limits,
and failure type compatibility before any recovery action is executed.
The policy engine MUST override AI/detection recommendations if they violate rules.
"""

from typing import Dict, Any, Union

try:
    from ..models import Payment
except ImportError:
    try:
        from models import Payment
    except ImportError:
        Payment = Any  # type: ignore


def validate_action(payment: Union[Payment, Any], proposed_action: str) -> Dict[str, Any]:
    """
    Validate and enforce policy constraints on a proposed recovery action.

    Rules:
    - If risk_score >= 80: only ESCALATE is allowed.
    - If attempt_count >= 3: do not allow RETRY_PAYMENT; return ESCALATE.
    - RETRY_PAYMENT is allowed only for: NETWORK_ERROR, TIMEOUT.
    - SEND_REMINDER is allowed for: INSUFFICIENT_FUNDS, CARD_DECLINED, EXPIRED_CARD.
    - GENERATE_PAYMENT_LINK is allowed for: CHECKOUT_ABANDONED.
    - Explicit ESCALATE is always allowed.

    Returns:
        dict:
            - allowed (bool): True if proposed action was compliant without override, False if overridden.
            - final_action (str): The authorized action to execute.
            - reason (str): Policy check reasoning or override justification.
    """
    risk_score = (
        getattr(payment, "risk_score", 0.0)
        if not isinstance(payment, dict)
        else payment.get("risk_score", 0.0)
    )
    attempt_count = (
        getattr(payment, "attempt_count", 1)
        if not isinstance(payment, dict)
        else payment.get("attempt_count", 1)
    )
    failure_reason = (
        getattr(payment, "failure_reason", None)
        if not isinstance(payment, dict)
        else payment.get("failure_reason")
    )

    # 1. High Risk Check (risk_score >= 80)
    if risk_score >= 80:
        if proposed_action == "ESCALATE":
            return {
                "allowed": True,
                "final_action": "ESCALATE",
                "reason": f"Policy approved: High-risk payment (score {risk_score:.1f} >= 80) is appropriately routed to ESCALATE.",
            }
        return {
            "allowed": False,
            "final_action": "ESCALATE",
            "reason": f"Policy override: High risk score ({risk_score:.1f} >= 80). Overriding '{proposed_action}' to ESCALATE for security & anti-fraud safeguards.",
        }

    # 2. Max Attempt Limit Check (attempt_count >= 3)
    if attempt_count >= 3 and proposed_action == "RETRY_PAYMENT":
        return {
            "allowed": False,
            "final_action": "ESCALATE",
            "reason": f"Policy override: Attempt count ({attempt_count} >= 3) has exceeded maximum retry limit. Overriding RETRY_PAYMENT to ESCALATE.",
        }

    # 3. RETRY_PAYMENT constraints: allowed only for NETWORK_ERROR and TIMEOUT
    if proposed_action == "RETRY_PAYMENT":
        if failure_reason not in ("NETWORK_ERROR", "TIMEOUT"):
            return {
                "allowed": False,
                "final_action": "ESCALATE",
                "reason": f"Policy override: RETRY_PAYMENT is only permitted for NETWORK_ERROR and TIMEOUT (received '{failure_reason}'). Overriding to ESCALATE.",
            }
        return {
            "allowed": True,
            "final_action": "RETRY_PAYMENT",
            "reason": f"Policy approved: RETRY_PAYMENT permitted for '{failure_reason}' (attempts: {attempt_count}, risk score: {risk_score:.1f}).",
        }

    # 4. SEND_REMINDER constraints: allowed for INSUFFICIENT_FUNDS, CARD_DECLINED, EXPIRED_CARD
    if proposed_action == "SEND_REMINDER":
        if failure_reason not in ("INSUFFICIENT_FUNDS", "CARD_DECLINED", "EXPIRED_CARD"):
            return {
                "allowed": False,
                "final_action": "ESCALATE",
                "reason": f"Policy override: SEND_REMINDER is only permitted for INSUFFICIENT_FUNDS, CARD_DECLINED, and EXPIRED_CARD (received '{failure_reason}'). Overriding to ESCALATE.",
            }
        return {
            "allowed": True,
            "final_action": "SEND_REMINDER",
            "reason": f"Policy approved: SEND_REMINDER permitted for '{failure_reason}'.",
        }

    # 5. GENERATE_PAYMENT_LINK constraints: allowed for CHECKOUT_ABANDONED
    if proposed_action == "GENERATE_PAYMENT_LINK":
        if failure_reason != "CHECKOUT_ABANDONED":
            return {
                "allowed": False,
                "final_action": "ESCALATE",
                "reason": f"Policy override: GENERATE_PAYMENT_LINK is only permitted for CHECKOUT_ABANDONED (received '{failure_reason}'). Overriding to ESCALATE.",
            }
        return {
            "allowed": True,
            "final_action": "GENERATE_PAYMENT_LINK",
            "reason": f"Policy approved: GENERATE_PAYMENT_LINK permitted for CHECKOUT_ABANDONED.",
        }

    # 6. Explicit ESCALATE action
    if proposed_action == "ESCALATE":
        return {
            "allowed": True,
            "final_action": "ESCALATE",
            "reason": "Policy approved: ESCALATE action is accepted.",
        }

    # 7. Unrecognized Action Fallback
    return {
        "allowed": False,
        "final_action": "ESCALATE",
        "reason": f"Policy override: Unrecognized proposed action '{proposed_action}'. Overriding to ESCALATE.",
    }
