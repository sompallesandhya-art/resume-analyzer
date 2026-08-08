from pydantic import BaseModel, Field
from typing import List, Optional


class ResumeAnalysisResponse(BaseModel):
    ats_score: int = Field(..., ge=0, le=100, description="ATS compatibility score out of 100")
    extracted_skills: List[str] = Field(default_factory=list)
    missing_skills: List[str] = Field(default_factory=list)
    strengths: List[str] = Field(default_factory=list)
    weaknesses: List[str] = Field(default_factory=list)
    suggestions: List[str] = Field(default_factory=list)
    summary: str = ""


class JDMatchResponse(BaseModel):
    match_score: int = Field(..., ge=0, le=100, description="Resume-to-JD compatibility score out of 100")
    matching_skills: List[str] = Field(default_factory=list, description="Skills present in both resume and JD")
    missing_skills: List[str] = Field(default_factory=list, description="Skills required by JD but absent from resume")
    strengths: List[str] = Field(default_factory=list, description="Ways the resume aligns well with this JD")
    gaps: List[str] = Field(default_factory=list, description="Specific gaps between resume and JD requirements")
    recommendation: str = ""


class ResumeRewriteResponse(BaseModel):
    professional_summary: str = Field(
        default="", description="Plain-text rewritten professional summary, no markdown"
    )
    improved_experience: List[str] = Field(
        default_factory=list, description="Plain-text rewritten experience bullet points"
    )
    improved_projects: List[str] = Field(
        default_factory=list, description="Plain-text rewritten project bullet points"
    )
    improved_skills: List[str] = Field(
        default_factory=list, description="Plain-text improved/reorganized skills list"
    )
    keyword_suggestions: List[str] = Field(
        default_factory=list, description="Plain-text ATS/JD-relevant keywords to add"
    )
    final_resume_tips: List[str] = Field(
        default_factory=list, description="Plain-text final actionable tips"
    )


class CoverLetterResponse(BaseModel):
    recipient: Optional[str] = Field(
        default=None, description="Plain-text recipient/hiring manager line, if inferable; otherwise null"
    )
    subject: str = Field(default="", description="Plain-text subject line for the cover letter")
    greeting: str = Field(default="", description="Plain-text greeting, e.g. Dear Hiring Manager,")
    introduction: str = Field(default="", description="Plain-text opening paragraph")
    body: str = Field(default="", description="Plain-text main body paragraph(s), no markdown")
    closing: str = Field(default="", description="Plain-text closing paragraph")
    signature: str = Field(default="", description="Plain-text sign-off, e.g. Sincerely, Candidate Name")
