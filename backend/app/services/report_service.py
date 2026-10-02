from datetime import datetime, timezone
from typing import List, Optional, Tuple
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.report import Report
from app.models.history import ReportHistory
from app.schemas.report import ReportCreate
from app.services.status_service import validate_transition

def now_utc():
    return datetime.now(timezone.utc)

def create_or_sync_report(db: Session, report_data: ReportCreate) -> Tuple[Report, bool]:
    """
    Idempotently creates a report or returns the existing record if already submitted.
    Returns (report, is_duplicate).
    """
    existing = db.query(Report).filter(Report.id == report_data.id).first()
    if existing:
        return existing, True

    reported_time = report_data.reported_at or now_utc()
    report = Report(
        id=report_data.id,
        category=report_data.category,
        description=report_data.description,
        latitude=report_data.latitude,
        longitude=report_data.longitude,
        priority=report_data.priority,
        status=report_data.status,
        reported_at=reported_time,
        created_at=now_utc(),
        updated_at=now_utc()
    )
    db.add(report)
    
    # Audit trail: CREATED event
    history_created = ReportHistory(
        report_id=report.id,
        event_type="CREATED",
        old_value=None,
        new_value=report.status,
        message=f"Report created with priority '{report.priority}' in category '{report.category}'.",
        created_at=now_utc()
    )
    db.add(history_created)

    # Audit trail: SYNCED event
    history_synced = ReportHistory(
        report_id=report.id,
        event_type="SYNCED",
        old_value=None,
        new_value="SYNCED",
        message="Initial synchronization completed successfully with backend server.",
        created_at=now_utc()
    )
    db.add(history_synced)

    db.commit()
    db.refresh(report)
    return report, False

def get_report_by_id(db: Session, report_id: str) -> Optional[Report]:
    return db.query(Report).filter(Report.id == report_id).first()

def get_reports(
    db: Session, 
    skip: int = 0, 
    limit: int = 100,
    status_filter: Optional[str] = None,
    priority_filter: Optional[str] = None,
    category_filter: Optional[str] = None
) -> List[Report]:
    query = db.query(Report)
    if status_filter:
        query = query.filter(Report.status == status_filter.upper())
    if priority_filter:
        query = query.filter(Report.priority == priority_filter.upper())
    if category_filter:
        query = query.filter(Report.category == category_filter)
    
    return query.order_by(Report.created_at.desc()).offset(skip).limit(limit).all()

def update_report_status(
    db: Session, 
    report_id: str, 
    new_status: str, 
    note: Optional[str] = None
) -> Report:
    report = get_report_by_id(db, report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with ID '{report_id}' not found."
        )

    clean_status = new_status.strip().upper()
    validate_transition(report.status, clean_status)

    old_status = report.status
    if old_status != clean_status:
        report.status = clean_status
        report.updated_at = now_utc()

        msg = note if note else f"Status transitioned from {old_status} to {clean_status}."
        history_entry = ReportHistory(
            report_id=report.id,
            event_type="STATUS_CHANGED",
            old_value=old_status,
            new_value=clean_status,
            message=msg,
            created_at=now_utc()
        )
        db.add(history_entry)
        db.commit()
        db.refresh(report)

    return report

def get_report_history(db: Session, report_id: str) -> List[ReportHistory]:
    report = get_report_by_id(db, report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with ID '{report_id}' not found."
        )
    return db.query(ReportHistory).filter(ReportHistory.report_id == report_id).order_by(ReportHistory.created_at.desc()).all()

def log_sync_event(db: Session, report_id: str, success: bool, message: Optional[str] = None) -> None:
    report = get_report_by_id(db, report_id)
    if not report:
        return
    event_type = "SYNCED" if success else "SYNC_FAILED"
    entry = ReportHistory(
        report_id=report_id,
        event_type=event_type,
        old_value=None,
        new_value="SUCCESS" if success else "FAILED",
        message=message or ("Synchronization succeeded." if success else "Synchronization attempt failed."),
        created_at=now_utc()
    )
    db.add(entry)
    db.commit()
