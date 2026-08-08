from fastapi import HTTPException
from app.core.config import settings
from app.services.gemini_service import client, _extract_json

COVER_LETTER_PROMPT_TEMPLATE = """
You are an expert professional cover letter writer.

Write a tailored, compelling cover letter for the candidate based on their
resume and the target job description below.

STRICT OUTPUT RULES:
- Return STRICT JSON only — no markdown, no code fences, no explanation text
  outside the JSON object.
- Every string value must be PLAIN TEXT. Do not use markdown syntax such as
  **bold**, *italics*, bullet characters (-, *, •), or headings inside any
  field.
- Keep the tone professional, confident, and specific to the job description.
  Do not fabricate experience that is not supported by the resume.

Return JSON in exactly this structure:
{{
  "recipient": <a plain-text recipient line such as "Hiring Manager, {{Company}}" if a company/hiring manager name can be reasonably inferred from the job description, otherwise null>,
  "subject": <a plain-text subject line for the cover letter, referencing the role>,
  "greeting": <a plain-text greeting line, e.g. "Dear Hiring Manager,">,
  "introduction": <a plain-text opening paragraph that states the role being applied for and a compelling hook, 2-3 sentences>,
  "body": <a plain-text main body of 2-3 paragraphs (as a single string, paragraphs separated by a blank line) connecting the candidate's resume experience to the job description's requirements>,
  "closing": <a plain-text closing paragraph reiterating interest and inviting next steps, 2-3 sentences>,
  "signature": <a plain-text sign-off, e.g. "Sincerely,\\nCandidate Name">
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


def generate_cover_letter(resume_text: str, job_description: str) -> dict:
    """
    Sends resume text + job description to Groq and returns a structured,
    plain-text cover letter dict. Reuses the shared Groq client and
    JSON-parsing helper from gemini_service.py.
    """
    if not settings.GROQ_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Groq API key is not configured on the server."
        )

    prompt = COVER_LETTER_PROMPT_TEMPLATE.format(
        resume_text=resume_text,
        job_description=job_description,
    )

    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are an expert cover letter writer. Always respond "
                        "with valid JSON only, using plain text with no "
                        "markdown formatting in any field."
                    ),
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.6,
        )

        raw_text = response.choices[0].message.content

        print("RAW RESPONSE:")
        print(raw_text)

        return _extract_json(raw_text)

    except Exception as e:
        import traceback
        traceback.print_exc()
        raise
