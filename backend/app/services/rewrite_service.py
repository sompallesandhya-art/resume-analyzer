from fastapi import HTTPException
from app.core.config import settings
from app.services.gemini_service import client, _extract_json

REWRITE_PROMPT_BASE = """
You are an expert professional resume writer.

Rewrite and improve the content of the following resume to make it stronger,
more results-oriented, and more likely to pass ATS screening.

STRICT OUTPUT RULES:
- Return STRICT JSON only — no markdown, no code fences, no explanation text
  outside the JSON object.
- Every string value must be PLAIN TEXT. Do not use markdown syntax such as
  **bold**, *italics*, bullet characters (-, *, •), numbered prefixes, or
  headings inside any string. Each array item must be a single clean sentence
  or phrase with no embedded formatting.

Return JSON in exactly this structure:
{{
  "professional_summary": <a plain-text rewritten professional summary, 2-4 sentences>,
  "improved_experience": [<plain-text rewritten, results-oriented experience bullet points>],
  "improved_projects": [<plain-text rewritten, results-oriented project bullet points>],
  "improved_skills": [<plain-text improved and well-organized skills, one skill per item>],
  "keyword_suggestions": [<plain-text ATS-relevant keywords/phrases the candidate should add>],
  "final_resume_tips": [<plain-text actionable tips to further strengthen the resume>]
}}

Resume Text:
\"\"\"
{resume_text}
\"\"\"
"""

REWRITE_PROMPT_WITH_JD_SUFFIX = """

The candidate is targeting the following job. Tailor the professional summary,
improved experience, improved projects, improved skills, and keyword
suggestions specifically toward this job description, while staying truthful
to the original resume content.

Job Description:
\"\"\"
{job_description}
\"\"\"
"""


def rewrite_resume(resume_text: str, job_description: str = "") -> dict:
    """
    Sends resume text (and optionally a job description) to Groq and returns
    a structured, plain-text rewrite suggestion dict. Reuses the shared Groq
    client and JSON-parsing helper from gemini_service.py.

    If job_description is empty/whitespace, the JD section is omitted from
    the prompt entirely and the rewrite is based on the resume alone.
    """
    if not settings.GROQ_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Groq API key is not configured on the server."
        )

    prompt = REWRITE_PROMPT_BASE.format(resume_text=resume_text)

    if job_description and job_description.strip():
        prompt += REWRITE_PROMPT_WITH_JD_SUFFIX.format(
            job_description=job_description.strip()
        )

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert resume writer. Always respond with "
                        "valid JSON only, using plain text with no markdown "
                        "formatting in any field."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.5,
            response_format={"type": "json_object"},
        )
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Groq API error: {str(e)}")

    raw_text = response.choices[0].message.content
    if not raw_text:
        raise HTTPException(status_code=502, detail="Empty response from Groq.")

    return _extract_json(raw_text)
