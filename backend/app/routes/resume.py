from typing import Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.services.pdf_extractor import extract_text_from_pdf
from app.services.gemini_service import analyze_resume_with_gemini
from app.services.jd_match_service import match_resume_with_jd
from app.services.rewrite_service import rewrite_resume
from app.services.cover_letter_service import generate_cover_letter
from app.schemas.resume_schema import (
    ResumeAnalysisResponse,
    JDMatchResponse,
    ResumeRewriteResponse,
    CoverLetterResponse,
)
from app.core.config import settings

router = APIRouter(prefix="/resume", tags=["Resume"])


@router.post("/analyze", response_model=ResumeAnalysisResponse)
async def analyze_resume(file: UploadFile = File(...)):
    # Validate file type
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    # Read and validate file size
    file_bytes = await file.read()
    size_mb = len(file_bytes) / (1024 * 1024)
    if size_mb > settings.MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size is {settings.MAX_FILE_SIZE_MB}MB."
        )

    # Extract text from PDF
    extracted_text = extract_text_from_pdf(file_bytes)

    # Analyze with Groq
    analysis = analyze_resume_with_gemini(extracted_text)

    return analysis


@router.post("/match-jd", response_model=JDMatchResponse)
async def match_jd(
    file: UploadFile = File(...),
    job_description: str = Form(...),
):
    # Validate file type
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    # Validate job description
    if not job_description or not job_description.strip():
        raise HTTPException(status_code=400, detail="Job description cannot be empty.")

    # Read and validate file size
    file_bytes = await file.read()
    size_mb = len(file_bytes) / (1024 * 1024)
    if size_mb > settings.MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size is {settings.MAX_FILE_SIZE_MB}MB."
        )

    # Extract text from PDF
    extracted_text = extract_text_from_pdf(file_bytes)

    # Match resume against job description with Groq
    match_result = match_resume_with_jd(extracted_text, job_description)

    return match_result


@router.post("/rewrite", response_model=ResumeRewriteResponse)
async def rewrite(
    file: UploadFile = File(...),
    job_description: Optional[str] = Form(None),
):
    # Validate file type
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    # Read and validate file size
    file_bytes = await file.read()
    size_mb = len(file_bytes) / (1024 * 1024)
    if size_mb > settings.MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size is {settings.MAX_FILE_SIZE_MB}MB."
        )

    # Extract text from PDF
    extracted_text = extract_text_from_pdf(file_bytes)

    # Rewrite resume with Groq (job_description is optional)
    rewrite_result = rewrite_resume(extracted_text, job_description or "")

    return rewrite_result


@router.post("/cover-letter", response_model=CoverLetterResponse)
async def cover_letter(
    file: UploadFile = File(...),
    job_description: str = Form(...),
):
    # Validate file type
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")

    # Validate job description (required for cover letters)
    if not job_description or not job_description.strip():
        raise HTTPException(status_code=400, detail="Job description cannot be empty.")

    # Read and validate file size
    file_bytes = await file.read()
    size_mb = len(file_bytes) / (1024 * 1024)
    if size_mb > settings.MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=400,
            detail=f"File too large. Max size is {settings.MAX_FILE_SIZE_MB}MB."
        )

    # Extract text from PDF
    extracted_text = extract_text_from_pdf(file_bytes)

    # Generate cover letter with Groq
    letter = generate_cover_letter(extracted_text, job_description)

    return letter
