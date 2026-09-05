"""
Comprehensive test suite for Gemini AI recovery recommendations in RecoverAI.

Tests the explicit recovery strategy rules:
1. NETWORK_ERROR + attempts 1 + risk 30 -> RETRY_PAYMENT
2. TIMEOUT + attempts 1 + risk 20 -> RETRY_PAYMENT
3. CARD_DECLINED + attempts 1 + risk 40 -> SEND_REMINDER
4. CHECKOUT_ABANDONED + risk 20 -> GENERATE_PAYMENT_LINK
5. NETWORK_ERROR + risk 90 -> ESCALATE (High Risk Rule)
6. NETWORK_ERROR + attempts 3 -> ESCALATE (Retry Limit Rule)
7. Gemini failure -> Deterministic Fallback
8. Authoritative Policy Override -> Policy overrides unsafe actions
9. End-to-end 7-step pipeline audit trail in AgentLog
"""

import os
import unittest
from unittest.mock import MagicMock, patch
# pyrefly: ignore [missing-import]
from sqlalchemy import create_engine
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import sessionmaker

from backend.database import Base
from backend.models import Merchant, Customer, Payment, AgentLog, RecoveryAction
from backend.agent.gemini_agent import (
    RecoveryRecommendation,
    diagnose_with_gemini,
    check_gemini_configured,
)
from backend.agent.policy import validate_action
from backend.agent.orchestrator import run_recovery_agent
from backend.agent.diagnosis import diagnose_payment


class TestGeminiRecoveryRules(unittest.TestCase):
    def setUp(self):
        # In-memory SQLite database for test isolation
        self.engine = create_engine("sqlite:///:memory:")
        Base.metadata.create_all(self.engine)
        self.Session = sessionmaker(bind=self.engine)
        self.db = self.Session()

        # Seed test merchant & customer
        self.merchant = Merchant(name="Test Merchant", email="test@merchant.in")
        self.customer = Customer(
            name="Test Customer",
            email="cust@test.in",
            phone="+919876543210",
            customer_type="REGULAR",
        )
        self.db.add(self.merchant)
        self.db.add(self.customer)
        self.db.commit()
        self.db.refresh(self.merchant)
        self.db.refresh(self.customer)

    def tearDown(self):
        self.db.close()
        Base.metadata.drop_all(self.engine)

    # -------------------------------------------------------------------------
    # Rule Case 1: NETWORK_ERROR + attempts 1 + risk 30 -> RETRY_PAYMENT
    # -------------------------------------------------------------------------
    def test_case_01_network_error_retry(self):
        """Case 1: NETWORK_ERROR + attempts 1 + risk 30 -> RETRY_PAYMENT"""
        payment = Payment(
            transaction_id="pay_test_case_1",
            merchant_id=self.merchant.id,
            customer_id=self.customer.id,
            amount=1500.0,
            currency="INR",
            status="FAILED",
            failure_reason="NETWORK_ERROR",
            attempt_count=1,
            risk_score=30.0,
            payment_method="UPI",
        )
        self.db.add(payment)
        self.db.commit()

        result = diagnose_with_gemini(payment)
        self.assertEqual(result["recommended_action"], "RETRY_PAYMENT")
        self.assertFalse(result["is_fallback"])
        print(f"\n[Case 1 Passed] {payment.failure_reason} -> {result['recommended_action']}")

    # -------------------------------------------------------------------------
    # Rule Case 2: TIMEOUT + attempts 1 + risk 20 -> RETRY_PAYMENT
    # -------------------------------------------------------------------------
    def test_case_02_timeout_retry(self):
        """Case 2: TIMEOUT + attempts 1 + risk 20 -> RETRY_PAYMENT"""
        payment = Payment(
            transaction_id="pay_test_case_2",
            merchant_id=self.merchant.id,
            customer_id=self.customer.id,
            amount=2200.0,
            currency="INR",
            status="FAILED",
            failure_reason="TIMEOUT",
            attempt_count=1,
            risk_score=20.0,
            payment_method="NETBANKING",
        )
        self.db.add(payment)
        self.db.commit()

        result = diagnose_with_gemini(payment)
        self.assertEqual(result["recommended_action"], "RETRY_PAYMENT")
        self.assertFalse(result["is_fallback"])
        print(f"\n[Case 2 Passed] {payment.failure_reason} -> {result['recommended_action']}")

    # -------------------------------------------------------------------------
    # Rule Case 3: CARD_DECLINED + attempts 1 + risk 40 -> SEND_REMINDER
    # -------------------------------------------------------------------------
    def test_case_03_card_declined_reminder(self):
        """Case 3: CARD_DECLINED + attempts 1 + risk 40 -> SEND_REMINDER"""
        payment = Payment(
            transaction_id="pay_test_case_3",
            merchant_id=self.merchant.id,
            customer_id=self.customer.id,
            amount=4500.0,
            currency="INR",
            status="FAILED",
            failure_reason="CARD_DECLINED",
            attempt_count=1,
            risk_score=40.0,
            payment_method="CARD",
        )
        self.db.add(payment)
        self.db.commit()

        result = diagnose_with_gemini(payment)
        self.assertEqual(result["recommended_action"], "SEND_REMINDER")
        self.assertFalse(result["is_fallback"])
        print(f"\n[Case 3 Passed] {payment.failure_reason} -> {result['recommended_action']}")

    # -------------------------------------------------------------------------
    # Rule Case 4: CHECKOUT_ABANDONED + risk 20 -> GENERATE_PAYMENT_LINK
    # -------------------------------------------------------------------------
    def test_case_04_checkout_abandoned_payment_link(self):
        """Case 4: CHECKOUT_ABANDONED + risk 20 -> GENERATE_PAYMENT_LINK"""
        payment = Payment(
            transaction_id="pay_test_case_4",
            merchant_id=self.merchant.id,
            customer_id=self.customer.id,
            amount=3100.0,
            currency="INR",
            status="FAILED",
            failure_reason="CHECKOUT_ABANDONED",
            attempt_count=1,
            risk_score=20.0,
            payment_method="UPI",
        )
        self.db.add(payment)
        self.db.commit()

        result = diagnose_with_gemini(payment)
        self.assertEqual(result["recommended_action"], "GENERATE_PAYMENT_LINK")
        self.assertFalse(result["is_fallback"])
        print(f"\n[Case 4 Passed] {payment.failure_reason} -> {result['recommended_action']}")

    # -------------------------------------------------------------------------
    # Rule Case 5: NETWORK_ERROR + risk 90 -> ESCALATE
    # -------------------------------------------------------------------------
    def test_case_05_high_risk_escalate(self):
        """Case 5: NETWORK_ERROR + risk 90 -> ESCALATE"""
        payment = Payment(
            transaction_id="pay_test_case_5",
            merchant_id=self.merchant.id,
            customer_id=self.customer.id,
            amount=15000.0,
            currency="INR",
            status="FAILED",
            failure_reason="NETWORK_ERROR",
            attempt_count=1,
            risk_score=90.0,  # High risk >= 80
            payment_method="UPI",
        )
        self.db.add(payment)
        self.db.commit()

        result = diagnose_with_gemini(payment)
        self.assertEqual(result["recommended_action"], "ESCALATE")
        self.assertFalse(result["is_fallback"])
        print(f"\n[Case 5 Passed] Risk score {payment.risk_score} -> {result['recommended_action']}")

    # -------------------------------------------------------------------------
    # Rule Case 6: NETWORK_ERROR + attempts 3 -> ESCALATE
    # -------------------------------------------------------------------------
    def test_case_06_retry_limit_escalate(self):
        """Case 6: NETWORK_ERROR + attempts 3 -> ESCALATE"""
        payment = Payment(
            transaction_id="pay_test_case_6",
            merchant_id=self.merchant.id,
            customer_id=self.customer.id,
            amount=1800.0,
            currency="INR",
            status="FAILED",
            failure_reason="NETWORK_ERROR",
            attempt_count=3,  # Attempt limit >= 3
            risk_score=15.0,
            payment_method="UPI",
        )
        self.db.add(payment)
        self.db.commit()

        result = diagnose_with_gemini(payment)
        self.assertEqual(result["recommended_action"], "ESCALATE")
        self.assertFalse(result["is_fallback"])
        print(f"\n[Case 6 Passed] Attempts {payment.attempt_count} -> {result['recommended_action']}")

    # -------------------------------------------------------------------------
    # Rule Case 7: Gemini failure -> Deterministic fallback
    # -------------------------------------------------------------------------
    def test_case_07_gemini_failure_fallback(self):
        """Case 7: Gemini failure triggers deterministic fallback"""
        payment = Payment(
            transaction_id="pay_test_case_7",
            merchant_id=self.merchant.id,
            customer_id=self.customer.id,
            amount=3200.0,
            currency="INR",
            status="FAILED",
            failure_reason="INSUFFICIENT_FUNDS",
            attempt_count=1,
            risk_score=25.0,
            payment_method="CARD",
        )
        self.db.add(payment)
        self.db.commit()

        # Simulate Gemini API exception
        mock_client = MagicMock()
        mock_client.models.generate_content.side_effect = TimeoutError("Gemini API connection timed out")

        result = diagnose_with_gemini(payment, client=mock_client)
        self.assertTrue(result["is_fallback"])
        self.assertEqual(result["source"], "deterministic_fallback")
        self.assertEqual(result["recommended_action"], "SEND_REMINDER")
        self.assertIn("Insufficient customer balance", result["diagnosis"])
        print(f"\n[Case 7 Passed] Gemini failure fell back to deterministic diagnosis.")

    # -------------------------------------------------------------------------
    # Policy Enforcement & Pipeline Integration
    # -------------------------------------------------------------------------
    def test_policy_authoritative_override(self):
        """Authoritative policy validation overrides unsafe action to ESCALATE."""
        high_risk_payment = Payment(
            transaction_id="pay_override_test",
            merchant_id=self.merchant.id,
            customer_id=self.customer.id,
            amount=5000.0,
            currency="INR",
            status="FAILED",
            failure_reason="NETWORK_ERROR",
            attempt_count=1,
            risk_score=85.0,
            payment_method="UPI",
        )
        policy_result = validate_action(high_risk_payment, "RETRY_PAYMENT")
        self.assertFalse(policy_result["allowed"])
        self.assertEqual(policy_result["final_action"], "ESCALATE")

    def test_orchestrator_7_step_audit(self):
        """End-to-end 7-step pipeline execution and AgentLog persistence."""
        payment = Payment(
            transaction_id="pay_orch_audit_test",
            merchant_id=self.merchant.id,
            customer_id=self.customer.id,
            amount=2000.0,
            currency="INR",
            status="FAILED",
            failure_reason="TIMEOUT",
            attempt_count=1,
            risk_score=15.0,
            payment_method="UPI",
        )
        self.db.add(payment)
        self.db.commit()

        res = run_recovery_agent(self.db, payment)
        self.assertEqual(res["final_action"], "RETRY_PAYMENT")

        logs = self.db.query(AgentLog).filter(AgentLog.payment_id == payment.id).all()
        logged_steps = [l.agent_step for l in logs]
        self.assertEqual(
            logged_steps,
            ["DETECT", "GEMINI_DIAGNOSE", "DECIDE", "POLICY_CHECK", "EXECUTE", "VERIFY", "AUDIT"],
        )


if __name__ == "__main__":
    unittest.main()
