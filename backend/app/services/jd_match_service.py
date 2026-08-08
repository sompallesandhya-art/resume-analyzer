from fastapi import HTTPException
from app.core.config import settings
from app.services.gemini_service import client, _extract_json

JD_MATCH_PROMPT_TEMPLATE = """
You are an expert recruiter and ATS matching specialist.

Compare the following resume against the given job description and return your
evaluation as STRICT JSON only — no markdown, no code fences, no explanation
text outside the JSON object.

Return JSON in exactly this structure:
{{
  "match_score": <integer 0-100, overall compatibility between resume and JD>,
  "matching_skills": [<skills/technologies present in both resume and JD>],
  "missing_skills": [<skills required by the JD but absent from the resume>],
  "strengths": [<3-5 specific ways this resume aligns well with the JD>],
  "gaps": [<3-5 specific gaps between the resume and JD requirements>],
  "recommendation": "<2-3 sentence recommendation on how to improve resume-JD fit>"
}}

Resume Text:
\"\"\"
{resume_text}
\"\"\"

Job Description:
\"\"\"
{job_description}
\"\"\"
"""


def match_resume_with_jd(resume_text: str, job_description: str) -> dict:
    """
    Sends resume + job description to Groq (Llama 3.3 70B) and returns a
    structured resume-to-JD match analysis dict. Reuses the shared Groq
    client and JSON-parsing helper from gemini_service.py.
    """
    if not settings.GROQ_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Groq API key is not configured on the server."
        )

    prompt = JD_MATCH_PROMPT_TEMPLATE.format(
        resume_text=resume_text,
        job_description=job_description,
    )

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You are an expert recruiter comparing resumes against job descriptions. Always respond with valid JSON only.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.4,
            response_format={"type": "json_object"},
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Groq API error: {str(e)}")

    raw_text = response.choices[0].message.content
    if not raw_text:
        raise HTTPException(status_code=502, detail="Empty response from Groq.")

    return _extract_json(raw_text)
