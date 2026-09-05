import random
from datetime import datetime, timedelta, timezone
from faker import Faker

try:
    from .database import SessionLocal, create_tables, engine, Base
    from .models import Merchant, Customer, Payment, RecoveryAction, AgentLog
except ImportError:
    from database import SessionLocal, create_tables, engine, Base
    from models import Merchant, Customer, Payment, RecoveryAction, AgentLog

fake = Faker("en_IN")
Faker.seed(42)
random.seed(42)

FAILURE_REASONS = [
    "NETWORK_ERROR",
    "INSUFFICIENT_FUNDS",
    "CARD_DECLINED",
    "EXPIRED_CARD",
    "TIMEOUT",
    "CHECKOUT_ABANDONED",
]

PAYMENT_METHODS = ["CARD", "UPI", "NETBANKING", "WALLET"]
CUSTOMER_TYPES = ["NEW", "RETURNING", "VIP", "SME", "ENTERPRISE"]

MERCHANT_DATA = [
    {"name": "NovaStyle Fashion Ltd", "email": "billing@novastyle.in"},
    {"name": "TechPulse Cloud Solutions", "email": "payments@techpulse.io"},
    {"name": "UrbanBite Quick Delivery", "email": "finance@urbanbite.in"},
]


def seed_database():
    """Seeds the database with merchants, customers, and payments."""
    print("Initializing database tables...")
    create_tables()

    db = SessionLocal()
    try:
        # Clear existing data in reverse dependency order
        print("Clearing existing data...")
        db.query(AgentLog).delete()
        db.query(RecoveryAction).delete()
        db.query(Payment).delete()
        db.query(Customer).delete()
        db.query(Merchant).delete()
        db.commit()

        # 1. Seed 3 Merchants
        print("Seeding 3 merchants...")
        merchants = []
        for m_data in MERCHANT_DATA:
            merchant = Merchant(
                name=m_data["name"],
                email=m_data["email"],
                created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(60, 180)),
            )
            db.add(merchant)
            merchants.append(merchant)
        db.commit()
        for m in merchants:
            db.refresh(m)

        # 2. Seed 100 Customers
        print("Seeding 100 customers...")
        customers = []
        for i in range(100):
            customer = Customer(
                name=fake.name(),
                email=fake.unique.email(),
                phone=f"+91{random.randint(6000000000, 9999999999)}",
                customer_type=random.choice(CUSTOMER_TYPES),
                created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(10, 120)),
            )
            db.add(customer)
            customers.append(customer)
        db.commit()
        for c in customers:
            db.refresh(c)

        # 3. Seed 150 Payments (Realistic distribution: ~60% SUCCESS, ~40% FAILED)
        print("Seeding 150 payments...")
        num_payments = 150
        num_success = 90  # 60%
        num_failed = 60   # 40%

        statuses = ["SUCCESS"] * num_success + ["FAILED"] * num_failed
        random.shuffle(statuses)

        payments = []
        now = datetime.now(timezone.utc)

        for idx, status in enumerate(statuses, start=1):
            merchant = random.choice(merchants)
            customer = random.choice(customers)

            # Amounts between ₹300 and ₹25,000
            amount = round(random.uniform(300.0, 25000.0), 2)
            payment_method = random.choice(PAYMENT_METHODS)
            attempt_count = random.randint(1, 4) if status == "FAILED" else random.randint(1, 2)
            
            # Risk scores between 0 and 100
            if status == "FAILED":
                risk_score = round(random.uniform(40.0, 98.0), 2)
                failure_reason = random.choice(FAILURE_REASONS)
            else:
                risk_score = round(random.uniform(2.0, 45.0), 2)
                failure_reason = None

            # Generate unique transaction ID
            txn_id = f"pay_{fake.hexify(text='^^^^^^^^^^^^^^^^')}"
            payment_date = now - timedelta(
                days=random.randint(0, 30),
                hours=random.randint(0, 23),
                minutes=random.randint(0, 59),
            )

            payment = Payment(
                transaction_id=txn_id,
                merchant_id=merchant.id,
                customer_id=customer.id,
                amount=amount,
                currency="INR",
                status=status,
                failure_reason=failure_reason,
                attempt_count=attempt_count,
                risk_score=risk_score,
                payment_method=payment_method,
                created_at=payment_date,
            )
            db.add(payment)
            payments.append(payment)

        db.commit()

        print(f"Successfully seeded:")
        print(f"- {len(merchants)} merchants")
        print(f"- {len(customers)} customers")
        print(f"- {len(payments)} payments ({num_success} SUCCESS, {num_failed} FAILED)")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
