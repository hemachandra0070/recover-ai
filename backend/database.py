import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Vercel's deployed filesystem is read-only. Use its writable temporary
# directory for the serverless runtime, while preserving the local database.
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    if os.getenv("VERCEL") == "1":
        DATABASE_FILE = os.path.join("/tmp", "recoverai.db")
    else:
        DATABASE_FILE = os.path.join(BASE_DIR, "recoverai.db")
    DATABASE_URL = f"sqlite:///{DATABASE_FILE}"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False, "timeout": 30}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency for obtaining database sessions in FastAPI routes."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all database tables defined in models."""
    try:
        from . import models
    except ImportError:
        import models
    Base.metadata.create_all(bind=engine)
