from datetime import datetime
from sqlalchemy import Column, String, Text, Float, DateTime
from sqlalchemy.orm import relationship
from app.db.session import Base

class Report(Base):
    __tablename__ = "reports"

    id = Column(String(36), primary_key=True, index=True)
    category = Column(String(100), nullable=False, index=True)
    description = Column(Text, nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    priority = Column(String(20), nullable=False, default="MEDIUM", index=True)
    status = Column(String(30), nullable=False, default="SUBMITTED", index=True)
    reported_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    history_entries = relationship("ReportHistory", back_populates="report", cascade="all, delete-orphan", order_by="desc(ReportHistory.created_at)")
