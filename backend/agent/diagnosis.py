"""
Deterministic diagnosis module for RecoverAI.

Analyzes failed payment transactions based on standardized gateway failure codes
and returns recovery diagnosis, estimated probability, and recommended action.
"""

from typing import Dict, Any, Union

try:
    from ..models import Payment
except ImportError:
    try:
        from models import Payment
    except ImportError:
        Payment = Any  # type: ignore


DIAGNOSIS_RULES = {
    "NETWORK_ERROR": {
        "diagnosis": "Temporary network failure",
        "recovery_probability": 0.85,
        "recommended_action": "RETRY_PAYMENT",
        "reason": "Payment failed due to a temporary network issue. Retrying the payment is the best recovery strategy.",
    },
    "TIMEOUT": {
        "diagnosis": "Payment request timed out",
        "recovery_probability": 0.80,
        "recommended_action": "RETRY_PAYMENT",
        "reason": "Payment gateway request timed out before response was received. Immediate retry is advised.",
    },
    "INSUFFICIENT_FUNDS": {
        "diagnosis": "Insufficient customer balance",
        "recovery_probability": 0.60,
        "recommended_action": "SEND_REMINDER",
        "reason": "Customer account had insufficient funds. Sending a recovery reminder allows them to top up and pay.",
    },
    "CHECKOUT_ABANDONED": {
        "diagnosis": "Customer abandoned checkout",
        "recovery_probability": 0.70,
        "recommended_action": "GENERATE_PAYMENT_LINK",
        "reason": "Customer dropped off during checkout. Generating a direct payment link encourages completion.",
    },
    "CARD_DECLINED": {
        "diagnosis": "Card payment was declined",
        "recovery_probability": 0.45,
        "recommended_action": "SEND_REMINDER",
        "reason": "Card transaction declined by issuing bank. Sending a reminder prompting alternate payment method.",
    },
    "EXPIRED_CARD": {
        "diagnosis": "Card has expired",
        "recovery_probability": 0.30,
        "recommended_action": "SEND_REMINDER",
        "reason": "Card has expired. Sending a reminder for customer to update card or use another payment method.",
    },
}


def diagnose_payment(payment: Union[Payment, Any]) -> Dict[str, Any]:
    """
    Diagnose a payment failure deterministically.

    Parameters:
        payment: SQLAlchemy Payment model instance or dict-like payment object.

    Returns:
        dict with keys:
            - diagnosis (str): Short human-readable failure diagnosis.
            - recovery_probability (float): Estimated likelihood of recovering the payment (0.0 - 1.0).
            - recommended_action (str): Suggested recovery action.
            - reason (str): Detailed technical rationale for the recommendation.
    """
    failure_reason = (
        getattr(payment, "failure_reason", None)
        if not isinstance(payment, dict)
        else payment.get("failure_reason")
    )

    if failure_reason and failure_reason in DIAGNOSIS_RULES:
        rule = DIAGNOSIS_RULES[failure_reason]
        return {
            "diagnosis": rule["diagnosis"],
            "recovery_probability": rule["recovery_probability"],
            "recommended_action": rule["recommended_action"],
            "reason": rule["reason"],
        }

    return {
        "diagnosis": f"Unrecognized failure reason ({failure_reason})",
        "recovery_probability": 0.20,
        "recommended_action": "ESCALATE",
        "reason": f"Payment failure reason '{failure_reason}' is unmapped or requires manual intervention.",
    }
