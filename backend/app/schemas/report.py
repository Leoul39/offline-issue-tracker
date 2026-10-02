from datetime import datetime, timezone
from typing import List, Optional
from pydantic import BaseModel, Field, field_validator, ConfigDict
import uuid

VALID_CATEGORIES = {
    "Broken Water Point",
    "Damaged Equipment",
    "Service Interruption",
    "Safety Concern",
    "Maintenance Required",
    "Damaged Solar Equipment",
    "Other"
}

VALID_PRIORITIES = {"LOW", "MEDIUM", "HIGH", "CRITICAL"}

VALID_STATUSES = {
    "DRAFT",
    "SUBMITTED",
    "ASSIGNED",
    "IN_PROGRESS",
    "RESOLVED",
    "REJECTED"
}

class ReportBase(BaseModel):
    category: str = Field(..., min_length=2, max_length=100)
    description: str = Field(..., min_length=3, max_length=2000)
    latitude: float = Field(..., ge=-90.0, le=90.0)
    longitude: float = Field(..., ge=-180.0, le=180.0)
    priority: str = Field(default="MEDIUM")
    status: str = Field(default="SUBMITTED")
    reported_at: Optional[datetime] = None

    @field_validator("category")
    @classmethod
    def validate_category(cls, v: str) -> str:
        clean = v.strip()
        if not clean:
            raise ValueError("Category cannot be empty")
        return clean

    @field_validator("priority")
    @classmethod
    def validate_priority(cls, v: str) -> str:
        upper = v.strip().upper()
        if upper not in VALID_PRIORITIES:
            raise ValueError(f"Priority must be one of {sorted(list(VALID_PRIORITIES))}")
        return upper

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        upper = v.strip().upper()
        if upper not in VALID_STATUSES:
            raise ValueError(f"Status must be one of {sorted(list(VALID_STATUSES))}")
        return upper

class ReportCreate(ReportBase):
    id: str = Field(..., description="Client-generated UUID")

    @field_validator("id")
    @classmethod
    def validate_uuid(cls, v: str) -> str:
        clean = v.strip()
        try:
            uuid.UUID(clean)
        except ValueError:
            raise ValueError("ID must be a valid UUID string")
        return clean

class ReportUpdateStatus(BaseModel):
    status: str
    note: Optional[str] = Field(None, max_length=500)

    @field_validator("status")
    @classmethod
    def validate_status(cls, v: str) -> str:
        upper = v.strip().upper()
        if upper not in VALID_STATUSES:
            raise ValueError(f"Status must be one of {sorted(list(VALID_STATUSES))}")
        return upper

class ReportResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    category: str
    description: str
    latitude: float
    longitude: float
    priority: str
    status: str
    reported_at: datetime
    created_at: datetime
    updated_at: datetime

class ReportSyncResponse(BaseModel):
    report: ReportResponse
    is_duplicate: bool = False
    message: str
