import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
    ALLOWED_ORIGINS = os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:5173,http://localhost:5174"
    ).split(",")

    MAX_FILE_SIZE_MB = 5


settings = Settings()
