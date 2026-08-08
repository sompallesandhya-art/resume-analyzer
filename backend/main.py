from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.routes import resume
from app.routes import versions
from app.core.config import settings

app = FastAPI(title="AI Resume Analyzer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(resume.router)
app.include_router(versions.router)

@app.get("/")
def home():
    return {
        "message": "AI Resume Analyzer API is Running!"
    }
