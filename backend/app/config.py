import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from dotenv import load_dotenv

load_dotenv()

class Settings(BaseSettings):
    PROJECT_NAME: str = "Offline Field Issue Tracker"
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql://postgres:leoul@localhost:5432/offline_issue_tracker"
    )
    PORT: int = int(os.getenv("PORT", "8000"))

    model_config = SettingsConfigDict(case_sensitive=True)

settings = Settings()
