"""
Recovery execution service for RecoverAI.

Executes recovery actions via the payment service, persists RecoveryAction records,
logs step execution, and updates payment state when recovery succeeds.
"""

from datetime import datetime, timezone
from typing import Dict, Any
from sqlalchemy.orm import Session

try:
    from ..models import Payment, RecoveryAction, AgentLog
    from .payment_service import (
        retry_payment,
        generate_payment_link,
        send_recovery_reminder,
        escalate_payment,
    )
except ImportError:
    from models import Payment, RecoveryAction, AgentLog
    from services.payment_service import (
        retry_payment,
        generate_payment_link,
        send_recovery_reminder,
        escalate_payment,
    )


def execute_recovery_action(
    db: Session,
    payment: Payment,
    action: str,
    reason: str,
    confidence: float,
) -> Dict[str, Any]:
    """
    Executes a recovery action against a payment record.

    Steps:
    1. Dispatches action to corresponding mock payment service handler.
    2. Records execution and outcome in RecoveryAction table.
    3. If payment is successfully recovered, updates payment status to 'RECOVERED'.
    4. Records AgentLog entries for auditability.
    5. Commits changes to the database.

    Returns:
        dict: Execution summary with action details, success status, amount recovered, and db ids.
    """
    now = datetime.now(timezone.utc)

    # 1. Execute action through mock payment service
    if action == "RETRY_PAYMENT":
        action_result = retry_payment(payment)
    elif action == "GENERATE_PAYMENT_LINK":
        action_result = generate_payment_link(payment)
    elif action == "SEND_REMINDER":
        action_result = send_recovery_reminder(payment)
    elif action == "ESCALATE":
        action_result = escalate_payment(payment)
    else:
        # Fallback for unexpected action types
        action_result = {
            "success": False,
            "amount_recovered": 0.0,
            "message": f"Unsupported recovery action '{action}'. Defaulted to no-op.",
        }

    is_success = action_result.get("success", False)
    amount_recovered = float(action_result.get("amount_recovered", 0.0))
    action_status = "SUCCESS" if is_success else "FAILED"

    # 2. Update payment status if recovery succeeded
    if is_success and (amount_recovered > 0 or action == "RETRY_PAYMENT"):
        payment.status = "RECOVERED"
        db.add(payment)

    # 3. Create RecoveryAction database record
    recovery_record = RecoveryAction(
        payment_id=payment.id,
        action_type=action,
        reason=reason,
        confidence=confidence,
        status=action_status,
        amount_recovered=amount_recovered,
        executed_at=now,
    )
    db.add(recovery_record)

    # 4. Create AgentLog for EXECUTE
    execute_log = AgentLog(
        payment_id=payment.id,
        agent_step="EXECUTE",
        decision=action,
        reasoning=f"Dispatched '{action}' with confidence {confidence:.2f}. Result: {action_result.get('message')}",
        timestamp=now,
    )
    db.add(execute_log)

    db.commit()
    db.refresh(payment)
    db.refresh(recovery_record)

    return {
        "action": action,
        "action_status": action_status,
        "success": is_success,
        "amount_recovered": amount_recovered,
        "recovery_action_id": recovery_record.id,
        "message": action_result.get("message", ""),
        "payment_link": action_result.get("payment_link"),
    }
