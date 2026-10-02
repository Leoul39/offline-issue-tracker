from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.config import settings
from app.db.session import init_db, get_db
from app.api.reports import router as reports_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize database tables on startup
    init_db()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Backend API for Offline Field Issue Tracker with Idempotent Synchronization and Status Workflow",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routers
app.include_router(reports_router, prefix="/api")

@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
def health_check(db: Session = Depends(get_db)):
    """Health check endpoint that confirms API and database readiness."""
    try:
        db.execute(text("SELECT 1;"))
        db_status = "connected"
    except Exception as e:
        db_status = f"error: {str(e)}"

    return {
        "status": "healthy" if db_status == "connected" else "degraded",
        "service": settings.PROJECT_NAME,
        "database": db_status
    }
