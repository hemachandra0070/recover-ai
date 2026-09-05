from datetime import datetime, timezone
# pyrefly: ignore [missing-import]
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
# pyrefly: ignore [missing-import]
from sqlalchemy.orm import relationship

try:
    from .database import Base
except ImportError:
    from database import Base


def utc_now():
    return datetime.now(timezone.utc)



class Merchant(Base):
    __tablename__ = "merchants"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, unique=True, index=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    payments = relationship("Payment", back_populates="merchant", cascade="all, delete-orphan")


class Customer(Base):
    __tablename__ = "customers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), nullable=False, index=True)
    phone = Column(String(50), nullable=False)
    customer_type = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    payments = relationship("Payment", back_populates="customer", cascade="all, delete-orphan")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    transaction_id = Column(String(100), unique=True, nullable=False, index=True)
    merchant_id = Column(Integer, ForeignKey("merchants.id"), nullable=False, index=True)
    customer_id = Column(Integer, ForeignKey("customers.id"), nullable=False, index=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), nullable=False, default="INR")
    status = Column(String(50), nullable=False)
    failure_reason = Column(String(100), nullable=True)
    attempt_count = Column(Integer, nullable=False, default=1)
    risk_score = Column(Float, nullable=False, default=0.0)
    payment_method = Column(String(50), nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    merchant = relationship("Merchant", back_populates="payments")
    customer = relationship("Customer", back_populates="payments")
    recovery_actions = relationship("RecoveryAction", back_populates="payment", cascade="all, delete-orphan")
    agent_logs = relationship("AgentLog", back_populates="payment", cascade="all, delete-orphan")


class RecoveryAction(Base):
    __tablename__ = "recovery_actions"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=False, index=True)
    action_type = Column(String(100), nullable=False)
    reason = Column(Text, nullable=False)
    confidence = Column(Float, nullable=False)
    status = Column(String(50), nullable=False)
    amount_recovered = Column(Float, nullable=False, default=0.0)
    executed_at = Column(DateTime, nullable=True)

    # Relationships
    payment = relationship("Payment", back_populates="recovery_actions")


class AgentLog(Base):
    __tablename__ = "agent_logs"

    id = Column(Integer, primary_key=True, index=True)
    payment_id = Column(Integer, ForeignKey("payments.id"), nullable=False, index=True)
    agent_step = Column(String(100), nullable=False)
    decision = Column(String(255), nullable=True)
    reasoning = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=utc_now, nullable=False)

    # Relationships
    payment = relationship("Payment", back_populates="agent_logs")
