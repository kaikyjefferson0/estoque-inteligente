import os
from pathlib import Path

from dotenv import load_dotenv

# backend\.env
load_dotenv(Path(__file__).resolve().parents[2] / ".env")


class Settings:
    DATABASE_URL: str = os.getenv("DATABASE_URL", "")
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))


settings = Settings()
