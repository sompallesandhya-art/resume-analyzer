from datetime import datetime
from typing import Any, Dict, Optional
from uuid import UUID
from pydantic import BaseModel, Field


class ResumeVersionResponse(BaseModel):
    """Lightweight version info for list views. No resume_text/parsed_resume
    (kept out to avoid sending large payloads when listing many versions)."""

    id: UUID
    version_name: str
    source_filename: Optional[str] = None
    is_active: bool
    created_at: datetime
    updated_at: datetime


class ResumeVersionDetailResponse(ResumeVersionResponse):
    """Full version detail, including extracted text and parsed structure."""

    resume_text: str
    parsed_resume: Optional[Dict[str, Any]] = None


class ResumeVersionRenameRequest(BaseModel):
    version_name: str = Field(..., min_length=1, max_length=200)


class ResumeVersionCompareRequest(BaseModel):
    version_id_a: UUID
    version_id_b: UUID


class ResumeVersionCompareItem(BaseModel):
    id: UUID
    version_name: str
    resume_text: str


class ResumeVersionCompareResponse(BaseModel):
    version_a: ResumeVersionCompareItem
    version_b: ResumeVersionCompareItem
