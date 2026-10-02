from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict

class ReportHistoryResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    report_id: str
    event_type: str
    old_value: Optional[str] = None
    new_value: Optional[str] = None
    message: Optional[str] = None
    created_at: datetime
