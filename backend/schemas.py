from datetime import datetime
from typing import Optional, List, Any, Dict
# pyrefly: ignore [missing-import]
from pydantic import BaseModel, ConfigDict, Field


# ---------------------------------------------------------------------------
# Merchant Schemas
# ---------------------------------------------------------------------------
class MerchantBase(BaseModel):
    name: str
    email: str


class MerchantCreate(MerchantBase):
    pass


class MerchantResponse(MerchantBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Customer Schemas
# ---------------------------------------------------------------------------
class CustomerBase(BaseModel):
    name: str
    email: str
    phone: str
    customer_type: str


class CustomerCreate(CustomerBase):
    pass


class CustomerResponse(CustomerBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# RecoveryAction Schemas
# ---------------------------------------------------------------------------
class RecoveryActionBase(BaseModel):
    payment_id: int
    action_type: str
    reason: str
    confidence: float
    status: str
    amount_recovered: float = 0.0
    executed_at: Optional[datetime] = None


class RecoveryActionCreate(RecoveryActionBase):
    pass


class RecoveryActionResponse(RecoveryActionBase):
    id: int

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# AgentLog Schemas
# ---------------------------------------------------------------------------
class AgentLogBase(BaseModel):
    payment_id: int
    agent_step: str
    decision: Optional[str] = None
    reasoning: str


class AgentLogCreate(AgentLogBase):
    pass


class AgentLogResponse(AgentLogBase):
    id: int
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Payment Schemas
# ---------------------------------------------------------------------------
class PaymentBase(BaseModel):
    transaction_id: str
    merchant_id: int
    customer_id: int
    amount: float
    currency: str = "INR"
    status: str
    failure_reason: Optional[str] = None
    attempt_count: int = 1
    risk_score: float = 0.0
    payment_method: str


class PaymentCreate(PaymentBase):
    pass


class PaymentResponse(PaymentBase):
    id: int
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PaymentDetailResponse(PaymentResponse):
    customer: Optional[CustomerResponse] = None
    recovery_actions: List[RecoveryActionResponse] = Field(default_factory=list)
    agent_logs: List[AgentLogResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# Agent Run & Dashboard Schemas
# ---------------------------------------------------------------------------
class AgentRunResponse(BaseModel):
    payment_id: int
    transaction_id: Optional[str] = None
    diagnosis: str
    recovery_probability: float
    proposed_action: str
    final_action: str
    policy_decision: Dict[str, Any]
    action_result: Dict[str, Any]
    amount_recovered: float
    status: str
    is_fallback: Optional[bool] = False
    source: Optional[str] = "gemini"



class DashboardStatsResponse(BaseModel):
    total_payments: int
    successful_payments: int
    failed_payments: int
    revenue_at_risk: float
    total_recovered: float
    recovery_rate: float
    recovery_actions: int
    escalated_cases: int
