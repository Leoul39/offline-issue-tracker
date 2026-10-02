from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.config import settings

db_url = settings.DATABASE_URL
# Normalize postgresql:// to postgresql+psycopg2:// or postgresql+psycopg:// if needed
if db_url.startswith("postgresql://") and not (db_url.startswith("postgresql+")):
    # Prefer psycopg2 or psycopg based on driver
    try:
        import psycopg2  # noqa
        db_url = db_url.replace("postgresql://", "postgresql+psycopg2://", 1)
    except ImportError:
        pass

engine = create_engine(
    db_url,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from app.models.report import Report  # noqa
    from app.models.history import ReportHistory  # noqa
    Base.metadata.create_all(bind=engine)
