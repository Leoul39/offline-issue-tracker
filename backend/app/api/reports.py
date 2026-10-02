from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.report import (
    ReportCreate,
    ReportUpdateStatus,
    ReportResponse,
    ReportSyncResponse
)
from app.schemas.history import ReportHistoryResponse
from app.services import report_service

router = APIRouter(prefix="/reports", tags=["Reports"])

@router.post("", response_model=ReportResponse, status_code=status.HTTP_201_CREATED)
def create_report(report_in: ReportCreate, db: Session = Depends(get_db)):
    """
    Idempotent report creation.
    If a report with this client-generated UUID already exists, it is returned without duplication.
    """
    report, is_dup = report_service.create_or_sync_report(db, report_in)
    return report

@router.post("/{report_id}/sync", response_model=ReportSyncResponse, status_code=status.HTTP_200_OK)
def sync_report(report_id: str, report_in: Optional[ReportCreate] = None, db: Session = Depends(get_db)):
    """
    Explicit synchronization endpoint for client retry or online sync.
    Guarantees idempotency.
    """
    if report_in:
        report, is_dup = report_service.create_or_sync_report(db, report_in)
        return ReportSyncResponse(
            report=report,
            is_duplicate=is_dup,
            message="Report synced successfully (already existed)." if is_dup else "Report created and synced successfully."
        )
    
    # If no payload is sent, verify report exists
    existing = report_service.get_report_by_id(db, report_id)
    if not existing:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with ID '{report_id}' does not exist on server."
        )
    return ReportSyncResponse(
        report=existing,
        is_duplicate=True,
        message="Report verified on server."
    )

@router.get("", response_model=List[ReportResponse])
def list_reports(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    """List all reports with optional filters."""
    return report_service.get_reports(
        db,
        skip=skip,
        limit=limit,
        status_filter=status,
        priority_filter=priority,
        category_filter=category
    )

@router.get("/{report_id}", response_model=ReportResponse)
def get_report(report_id: str, db: Session = Depends(get_db)):
    """Retrieve details of a single report by ID."""
    report = report_service.get_report_by_id(db, report_id)
    if not report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report with ID '{report_id}' not found."
        )
    return report

@router.patch("/{report_id}/status", response_model=ReportResponse)
def update_status(report_id: str, update_in: ReportUpdateStatus, db: Session = Depends(get_db)):
    """
    Update the status of a report following the strict state transition workflow:
    DRAFT -> SUBMITTED -> ASSIGNED -> IN_PROGRESS -> RESOLVED
    (or to REJECTED from SUBMITTED, ASSIGNED, or IN_PROGRESS).
    """
    return report_service.update_report_status(
        db, 
        report_id=report_id, 
        new_status=update_in.status, 
        note=update_in.note
    )

@router.get("/{report_id}/history", response_model=List[ReportHistoryResponse])
def get_history(report_id: str, db: Session = Depends(get_db)):
    """Retrieve full audit trail / history for a specific report."""
    return report_service.get_report_history(db, report_id)
