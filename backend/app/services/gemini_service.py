import json
import re
from groq import Groq
from fastapi import HTTPException
from app.core.config import settings

client = Groq(api_key=settings.GROQ_API_KEY)

ANALYSIS_PROMPT_TEMPLATE = """
You are an expert ATS (Applicant Tracking System) resume reviewer and career coach.

Analyze the following resume text and return your evaluation as STRICT JSON only —
no markdown, no code fences, no explanation text outside the JSON object.

Return JSON in exactly this structure:
{{
  "ats_score": <integer 0-100, based on formatting, keyword usage, clarity, and structure>,
  "extracted_skills": [<list of skills/technologies found in the resume>],
  "missing_skills": [<list of commonly expected skills for the candidate's apparent role that are absent>],
  "strengths": [<3-5 specific strengths of this resume>],
  "weaknesses": [<3-5 specific weaknesses of this resume>],
  "suggestions": [<3-5 specific, actionable improvement suggestions>],
  "summary": "<2-3 sentence overall summary of the candidate's profile>"
}}

Resume Text:
\"\"\"
{resume_text}
\"\"\"
"""


def _extract_json(raw_text: str) -> dict:
    """
    Groq/Llama responses sometimes wrap JSON in markdown code fences despite
    instructions, and sometimes include raw (unescaped) control characters
    such as literal newlines inside string values. This function strips
    markdown fences and parses safely, tolerating those control characters.
    """
    cleaned = raw_text.strip()
    cleaned = re.sub(r"^```json\s*|^```\s*|```$", "", cleaned, flags=re.MULTILINE).strip()

    try:
        # strict=False allows literal control characters (e.g. raw newlines)
        # inside JSON string values, which some LLM outputs include despite
        # instructions to escape them.
        return json.loads(cleaned, strict=False)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", cleaned, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0), strict=False)
            except json.JSONDecodeError:
                pass
        raise HTTPException(
            status_code=502,
            detail="AI response could not be parsed. Please try again."
        )


def analyze_resume_with_gemini(resume_text: str) -> dict:
    """
    Sends resume text to Groq (Llama 3.3 70B) and returns a structured analysis dict.
    Function name kept as-is so no other files need to change.
    """
    if not settings.GROQ_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Groq API key is not configured on the server."
        )

    prompt = ANALYSIS_PROMPT_TEMPLATE.format(resume_text=resume_text)

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "You are an expert ATS resume reviewer. Always respond with valid JSON only."},
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
