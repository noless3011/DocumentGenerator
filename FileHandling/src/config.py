# config.py
import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Load environment variables from .env file
load_dotenv()

class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    GOOGLE_API_KEY: str = os.getenv('GOOGLE_API_KEY', '')
    ROOT_DIR: Path = Path(__file__).resolve().parent.parent # Adjust based on actual root
    ALLOWED_UPLOAD_EXTENSIONS: set[str] = {'xlsx', 'xls'}
    PROJECTS_REGISTRY_FILE: Path = ROOT_DIR / 'projects_registry.json'
    APP_SECRET_KEY: str = os.urandom(24).hex() # For potential future session/cookie use
    class Config:
        env_file = '.env'
        env_file_encoding = 'utf-8'

# Create a single settings instance
settings = Settings()

# Validate API key presence
if not settings.GOOGLE_API_KEY:
    raise ValueError("GOOGLE_API_KEY not found in environment variables or .env file.")

# Ensure root directory exists if needed (though it usually should)
settings.ROOT_DIR.mkdir(parents=True, exist_ok=True)

# Define upload directory relative to root (optional, could be part of Project class)
# UPLOAD_FOLDER: Path = settings.ROOT_DIR / 'uploads'
# OUTPUT_FOLDER: Path = settings.ROOT_DIR / 'outputs'
# UPLOAD_FOLDER.mkdir(parents=True, exist_ok=True)
# OUTPUT_FOLDER.mkdir(parents=True, exist_ok=True)

print(f"Configuration loaded. Root Dir: {settings.ROOT_DIR}")
print(f"Projects Registry File: {settings.PROJECTS_REGISTRY_FILE}")