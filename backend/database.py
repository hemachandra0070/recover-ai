import logging
import os
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import declarative_base, sessionmaker

try:
    from dotenv import load_dotenv
except ImportError:  # pragma: no cover - dependency is declared in requirements.txt
    load_dotenv = None

BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Load local .env files before reading DATABASE_URL. Vercel injects environment
# variables directly, so these files simply do not exist in production.
if load_dotenv is not None:
    for env_path in (Path(BASE_DIR) / ".env", Path.cwd() / ".env"):
        if env_path.exists():
            load_dotenv(dotenv_path=env_path, override=False)
            break

logger = logging.getLogger("recoverai.database")


def _normalize_database_url(url: str) -> str:
    """Normalize platform-provided PostgreSQL URLs to a SQLAlchemy driver URL."""
    if url.startswith("postgres://"):
        return "postgresql+psycopg2://" + url[len("postgres://"):]
    if url.startswith("postgresql://"):
        return "postgresql+psycopg2://" + url[len("postgresql://"):]
    return url


def _fallback_sqlite_url() -> str:
    """Return the local SQLite URL, or Vercel's ephemeral writable path."""
    if os.getenv("VERCEL"):
        return "sqlite:////tmp/recoverai.db"
    return f"sqlite:///{os.path.join(BASE_DIR, 'recoverai.db')}"


def _describe_database_url(url: str) -> str:
    """Describe a database URL without ever logging credentials."""
    try:
        parsed = make_url(url)
        host = parsed.host or "local"
        database = parsed.database or ""
        return f"{parsed.get_backend_name()}://{host}/{database}".rstrip("/")
    except Exception:
        return "the configured DATABASE_URL"


def _build_engine(database_url: str):
    options = {}
    backend = make_url(database_url).get_backend_name()
    if backend == "sqlite":
        options["connect_args"] = {"check_same_thread": False, "timeout": 30}
    else:
        options["pool_pre_ping"] = True
    return create_engine(database_url, **options)


DATABASE_URL = (os.getenv("DATABASE_URL") or "").strip()

if DATABASE_URL:
    DATABASE_URL = _normalize_database_url(DATABASE_URL)
else:
    DATABASE_URL = _fallback_sqlite_url()
    if os.getenv("VERCEL"):
        logger.warning(
            "DATABASE_URL is not set. Using ephemeral SQLite at /tmp/recoverai.db; "
            "payment data will not persist across deployments or function instances. "
            "Configure DATABASE_URL with a PostgreSQL connection string for production."
        )

try:
    engine = _build_engine(DATABASE_URL)
except Exception as exc:
    logger.error(
        "Could not initialize the database engine for %s (%s). "
        "Falling back to SQLite so the API can start. Configure DATABASE_URL "
        "with a supported PostgreSQL connection string and install its driver.",
        _describe_database_url(DATABASE_URL),
        type(exc).__name__,
    )
    DATABASE_URL = _fallback_sqlite_url()
    engine = _build_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency for obtaining database sessions in FastAPI routes."""
    create_tables()
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
