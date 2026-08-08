from typing import List
from uuid import UUID
from fastapi import APIRouter, Depends, File, Form, UploadFile
from app.dependencies.auth import get_current_user, CurrentUser
from app.schemas.version_schema import (
    ResumeVersionResponse,
    ResumeVersionDetailResponse,
    ResumeVersionRenameRequest,
    ResumeVersionCompareRequest,
    ResumeVersionCompareResponse,
)
from app.services import version_service

router = APIRouter(prefix="/versions", tags=["Resume Versions"])


@router.post("", response_model=ResumeVersionDetailResponse)
async def create_version(
    file: UploadFile = File(...),
    version_name: str = Form(...),
    current_user: CurrentUser = Depends(get_current_user),
):
    """Uploads a PDF and creates a new resume version for the authenticated user."""
    file_bytes = await file.read()
    return version_service.create_resume_version(
        user_id=current_user.id,
        file_bytes=file_bytes,
        content_type=file.content_type,
        source_filename=file.filename,
        version_name=version_name,
    )


@router.get("", response_model=List[ResumeVersionResponse])
async def list_versions(current_user: CurrentUser = Depends(get_current_user)):
    """Lists all resume versions belonging to the authenticated user."""
    return version_service.list_resume_versions(user_id=current_user.id)


@router.get("/{version_id}", response_model=ResumeVersionDetailResponse)
async def get_version(
    version_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Fetches full details of a single resume version owned by the user."""
    return version_service.get_resume_version(version_id, user_id=current_user.id)


@router.patch("/{version_id}", response_model=ResumeVersionDetailResponse)
async def rename_version(
    version_id: UUID,
    payload: ResumeVersionRenameRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Renames a resume version owned by the authenticated user."""
    return version_service.rename_resume_version(
        version_id, user_id=current_user.id, new_name=payload.version_name
    )


@router.post("/{version_id}/duplicate", response_model=ResumeVersionDetailResponse)
async def duplicate_version(
    version_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Duplicates a resume version, naming the copy '{original} (Copy)'."""
    return version_service.duplicate_resume_version(version_id, user_id=current_user.id)


@router.patch("/{version_id}/set-active", response_model=ResumeVersionDetailResponse)
async def set_active_version(
    version_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Marks a resume version as the user's active resume."""
    return version_service.set_active_version(version_id, user_id=current_user.id)


@router.delete("/{version_id}", status_code=204)
async def delete_version(
    version_id: UUID,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Deletes a resume version owned by the authenticated user."""
    version_service.delete_resume_version(version_id, user_id=current_user.id)


@router.post("/compare", response_model=ResumeVersionCompareResponse)
async def compare_versions(
    payload: ResumeVersionCompareRequest,
    current_user: CurrentUser = Depends(get_current_user),
):
    """Returns raw resume text for two versions owned by the user, for client-side diffing."""
    return version_service.compare_resume_versions(
        payload.version_id_a, payload.version_id_b, user_id=current_user.id
    )
