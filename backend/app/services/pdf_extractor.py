import fitz  # PyMuPDF
from fastapi import HTTPException


def extract_text_from_pdf(file_bytes: bytes) -> str:
    try:
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid or corrupted PDF file.")

    if doc.page_count == 0:
        raise HTTPException(status_code=400, detail="PDF has no pages.")

    text_parts = []

    for page in doc:
        text_parts.append(page.get_text())

    doc.close()

    full_text = "\n".join(text_parts).strip()

    if not full_text:
        raise HTTPException(
            status_code=422,
            detail="No extractable text found in PDF. It may be a scanned image."
        )

    return full_text
