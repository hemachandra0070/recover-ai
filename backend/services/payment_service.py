"""
Mock payment service for RecoverAI.

Simulates payment gateway recovery actions (retry, payment links, reminders, escalation).
IMPORTANT: For demo/testing only. No real financial transactions are executed.
"""

import random
from typing import Dict, Any, Union

try:
    from ..models import Payment
except ImportError:
    try:
        from models import Payment
    except ImportError:
        Payment = Any  # type: ignore


def retry_payment(payment: Union[Payment, Any]) -> Dict[str, Any]:
    """
    Simulates a payment retry via the payment gateway.

    Success rate: ~70% for eligible retry attempts.
    """
    amount = (
        getattr(payment, "amount", 0.0)
        if not isinstance(payment, dict)
        else payment.get("amount", 0.0)
    )
    txn_id = (
        getattr(payment, "transaction_id", "unknown")
        if not isinstance(payment, dict)
        else payment.get("transaction_id", "unknown")
    )

    # 70% simulated success rate
    is_success = random.random() < 0.70

    if is_success:
        return {
            "success": True,
            "amount_recovered": float(amount),
            "message": f"Payment retry succeeded for txn {txn_id}. Recovered INR {amount:,.2f} via mock gateway.",
        }
    else:
        return {
            "success": False,
            "amount_recovered": 0.0,
            "message": f"Payment retry failed at mock gateway for txn {txn_id}. Bank returned decline.",
        }


def generate_payment_link(payment: Union[Payment, Any]) -> Dict[str, Any]:
    """
    Simulates generating a dynamic payment recovery link for abandoned checkout.
    """
    txn_id = (
        getattr(payment, "transaction_id", "unknown")
        if not isinstance(payment, dict)
        else payment.get("transaction_id", "unknown")
    )
    amount = (
        getattr(payment, "amount", 0.0)
        if not isinstance(payment, dict)
        else payment.get("amount", 0.0)
    )
    
    mock_link = f"https://pay.recoverai.demo/link/{txn_id}"
    return {
        "success": True,
        "amount_recovered": 0.0,
        "payment_link": mock_link,
        "message": f"Recovery payment link generated for INR {amount:,.2f}: {mock_link}",
    }


def send_recovery_reminder(payment: Union[Payment, Any]) -> Dict[str, Any]:
    """
    Simulates sending a payment recovery reminder notification (SMS/Email/WhatsApp).
    """
    txn_id = (
        getattr(payment, "transaction_id", "unknown")
        if not isinstance(payment, dict)
        else payment.get("transaction_id", "unknown")
    )
    amount = (
        getattr(payment, "amount", 0.0)
        if not isinstance(payment, dict)
        else payment.get("amount", 0.0)
    )

    return {
        "success": True,
        "amount_recovered": 0.0,
        "message": f"Multi-channel recovery reminder dispatched for txn {txn_id} (amount INR {amount:,.2f}).",
    }


def escalate_payment(payment: Union[Payment, Any]) -> Dict[str, Any]:
    """
    Simulates escalating high-risk or unrecoverable transactions to merchant operations.
    """
    txn_id = (
        getattr(payment, "transaction_id", "unknown")
        if not isinstance(payment, dict)
        else payment.get("transaction_id", "unknown")
    )
    risk_score = (
        getattr(payment, "risk_score", 0.0)
        if not isinstance(payment, dict)
        else payment.get("risk_score", 0.0)
    )

    return {
        "success": True,
        "amount_recovered": 0.0,
        "message": f"Payment {txn_id} (Risk Score: {risk_score:.1f}) escalated to merchant risk operations team.",
    }
