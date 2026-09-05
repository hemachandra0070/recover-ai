from contextlib import asynccontextmanager
from typing import List, Optional
from fastapi import FastAPI, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func

try:
    from .database import engine, get_db, create_tables
    from .models import Payment, RecoveryAction, AgentLog, Merchant, Customer
    from .schemas import (
        PaymentResponse,
        PaymentDetailResponse,
        RecoveryActionResponse,
        AgentLogResponse,
        AgentRunResponse,
        DashboardStatsResponse,
    )
    from .agent.orchestrator import run_recovery_agent
except ImportError:
    from database import engine, get_db, create_tables
    from models import Payment, RecoveryAction, AgentLog, Merchant, Customer
    from schemas import (
        PaymentResponse,
        PaymentDetailResponse,
        RecoveryActionResponse,
        AgentLogResponse,
        AgentRunResponse,
        DashboardStatsResponse,
    )
    from agent.orchestrator import run_recovery_agent


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Automatically create tables on startup
    create_tables()
    yield


from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="RecoverAI - Autonomous Revenue Recovery Agent",
    description="Backend API and autonomous agent service for diagnosing, recovering, and auditing failed payment transactions.",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for frontend communication (supports Vite localhost:5173 / all origins)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------------------------------------------------------------------------
# Health Check & Root Endpoints
# ---------------------------------------------------------------------------
@app.get("/", tags=["System"])
def root():
    """Root service health and API index."""
    return {
        "status": "ok",
        "service": "RecoverAI",
        "version": "1.0.0",
        "docs_url": "/docs"
    }


@app.get("/health", tags=["System"])
def health_check():
    """Service health verification endpoint."""
    return {
        "status": "ok",
        "service": "RecoverAI"
    }



# ---------------------------------------------------------------------------
# Payment Endpoints
# ---------------------------------------------------------------------------
@app.get("/payments", response_model=List[PaymentResponse], tags=["Payments"])
def get_payments(
    status: Optional[str] = Query(None, description="Filter payments by status (e.g. FAILED, SUCCESS, RECOVERED)"),
    limit: Optional[int] = Query(None, ge=1, description="Maximum number of payments to return"),
    db: Session = Depends(get_db)
):
    """
    Retrieve payment transactions with optional status filter and limit.
    """
    query = db.query(Payment).order_by(Payment.created_at.desc())
    if status:
        query = query.filter(Payment.status == status.upper())
    if limit:
        query = query.limit(limit)
    return query.all()


@app.get("/payments/{payment_id}", response_model=PaymentDetailResponse, tags=["Payments"])
def get_payment_details(payment_id: int, db: Session = Depends(get_db)):
    """
    Retrieve complete payment details including associated recovery actions and agent logs.
    """
    payment = (
        db.query(Payment)
        .options(
            joinedload(Payment.customer),
            joinedload(Payment.recovery_actions),
            joinedload(Payment.agent_logs)
        )
        .filter(Payment.id == payment_id)
        .first()
    )
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payment with ID {payment_id} not found."
        )
    return payment


# ---------------------------------------------------------------------------
# Agent Orchestration Endpoint
# ---------------------------------------------------------------------------
@app.post("/agent/run/{payment_id}", response_model=AgentRunResponse, tags=["Agent"])
def trigger_recovery_agent(payment_id: int, db: Session = Depends(get_db)):
    """
    Triggers the autonomous 7-step Recovery Agent for a specific payment.
    Pipeline: DETECT -> DIAGNOSE -> DECIDE -> POLICY_CHECK -> EXECUTE -> VERIFY -> AUDIT.
    """
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Payment with ID {payment_id} not found."
        )

    result = run_recovery_agent(db=db, payment=payment)
    return result


# ---------------------------------------------------------------------------
# Dashboard Analytics Endpoint
# ---------------------------------------------------------------------------
@app.get("/dashboard/stats", response_model=DashboardStatsResponse, tags=["Dashboard"])
def get_dashboard_stats(db: Session = Depends(get_db)):
    """
    Computes real-time recovery metrics and financial performance indicators.
    """
    total_payments = db.query(Payment).count()
    successful_payments = db.query(Payment).filter(Payment.status.in_(["SUCCESS", "RECOVERED"])).count()
    failed_payments = db.query(Payment).filter(Payment.status == "FAILED").count()

    # revenue_at_risk = sum of amounts of currently FAILED payments
    revenue_at_risk_query = (
        db.query(func.coalesce(func.sum(Payment.amount), 0.0))
        .filter(Payment.status == "FAILED")
        .scalar()
    )
    revenue_at_risk = round(float(revenue_at_risk_query or 0.0), 2)

    # total_recovered = sum of amount_recovered from successful RecoveryAction records
    total_recovered_query = (
        db.query(func.coalesce(func.sum(RecoveryAction.amount_recovered), 0.0))
        .filter(RecoveryAction.status == "SUCCESS")
        .scalar()
    )
    total_recovered = round(float(total_recovered_query or 0.0), 2)

    # recovery_rate = total_recovered / total revenue at risk before recovery
    total_risk_base = revenue_at_risk + total_recovered
    recovery_rate = round(total_recovered / total_risk_base, 4) if total_risk_base > 0 else 0.0

    # Total recovery actions and escalated cases
    recovery_actions = db.query(RecoveryAction).count()
    escalated_cases = (
        db.query(RecoveryAction)
        .filter(RecoveryAction.action_type == "ESCALATE")
        .count()
    )

    return {
        "total_payments": total_payments,
        "successful_payments": successful_payments,
        "failed_payments": failed_payments,
        "revenue_at_risk": revenue_at_risk,
        "total_recovered": total_recovered,
        "recovery_rate": recovery_rate,
        "recovery_actions": recovery_actions,
        "escalated_cases": escalated_cases,
    }


# ---------------------------------------------------------------------------
# Agent Audit Logs Endpoint
# ---------------------------------------------------------------------------
@app.get("/agent/logs", response_model=List[AgentLogResponse], tags=["Agent"])
def get_agent_logs(
    payment_id: Optional[int] = Query(None, description="Filter logs by payment ID"),
    limit: Optional[int] = Query(50, ge=1, le=500, description="Maximum number of logs to return"),
    db: Session = Depends(get_db)
):
    """
    Retrieve audit trail of agent reasoning steps and decisions.
    """
    query = db.query(AgentLog).order_by(AgentLog.timestamp.desc(), AgentLog.id.desc())
    if payment_id is not None:
        query = query.filter(AgentLog.payment_id == payment_id)
    if limit is not None:
        query = query.limit(limit)
    return query.all()


# ---------------------------------------------------------------------------
# Recovery Actions Endpoint
# ---------------------------------------------------------------------------
@app.get("/recovery/actions", response_model=List[RecoveryActionResponse], tags=["Recovery"])
def get_recovery_actions(
    payment_id: Optional[int] = Query(None, description="Filter actions by payment ID"),
    limit: Optional[int] = Query(50, ge=1, le=500, description="Maximum number of actions to return"),
    db: Session = Depends(get_db)
):
    """
    Retrieve history of recovery actions executed by the agent.
    """
    query = db.query(RecoveryAction).order_by(RecoveryAction.executed_at.desc(), RecoveryAction.id.desc())
    if payment_id is not None:
        query = query.filter(RecoveryAction.payment_id == payment_id)
    if limit is not None:
        query = query.limit(limit)
    return query.all()
