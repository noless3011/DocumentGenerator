import json
import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings
# Load environment variables from .env file
load_dotenv()
class Settings(BaseSettings):
    """Application settings loaded from environment variables."""
    GEMINI_API_KEY: str = os.getenv('GEMINI_API_KEY', '') 
    print(f"GOOGLE_API_KEY: {GEMINI_API_KEY} ")  # Debugging line to check if the key is loaded
    ROOT_DIR: Path = Path(__file__).resolve().parent.parent
    ALLOWED_UPLOAD_EXTENSIONS: set[str] = {'.xlsx', '.xls'}  # Excel files for processing
    ALLOWED_SOURCE_EXTENSIONS: set[str] = {'.txt', '.csv', '.png', '.jpg', '.jpeg'}  # Source files
    PROJECTS_REGISTRY_FILE: Path = ROOT_DIR / 'projects_registry.json'
    APP_SECRET_KEY: str = os.getenv('APP_SECRET_KEY',os.urandom(24).hex())

    # Default model names for agents (can be overridden by specific agent configs or requests)
    DEFAULT_CHAT_MODEL: str = os.getenv('DEFAULT_CHAT_MODEL', "gemini/gemini-2.5-flash-preview-05-20")
    DEFAULT_TEXT_AGENT_MODEL: str = os.getenv('DEFAULT_TEXT_AGENT_MODEL', "gemini/gemini-2.5-flash-preview-05-20")
    DEFAULT_DIAGRAM_AGENT_MODEL: str = os.getenv('DEFAULT_DIAGRAM_AGENT_MODEL', "gemini/gemini-2.5-flash-preview-05-20")
    DEFAULT_PROTOTYPE_AGENT_MODEL: str = os.getenv('DEFAULT_PROTOTYPE_AGENT_MODEL', "gemini/gemini-2.5-flash-preview-05-20") # Often requires vision capabilities

    # Default names for registered shared agent instances
    DEFAULT_TEXT_AGENT_NAME: str = "global_text_agent"
    DEFAULT_DIAGRAM_AGENT_NAME: str = "global_diagram_agent"
    DEFAULT_PROTOTYPE_AGENT_NAME: str = "global_prototype_agent"


    class Config:
        env_file = '.env'
        env_file_encoding = 'utf-8'

settings = Settings()

if not settings.GEMINI_API_KEY: # Or your primary LLM API key
    print("Warning: GOOGLE_API_KEY (or your primary LLM API key) not found in environment variables or .env file. LLM-dependent features may fail.")
    # raise ValueError("GOOGLE_API_KEY not found...") # Optionally make it a hard requirement

settings.ROOT_DIR.mkdir(parents=True, exist_ok=True)

print(f"Configuration loaded. Root Dir: {settings.ROOT_DIR}")
print(f"Projects Registry File: {settings.PROJECTS_REGISTRY_FILE}")
if not settings.PROJECTS_REGISTRY_FILE.exists():
    print(f"Projects registry file will be created at: {settings.PROJECTS_REGISTRY_FILE}")
    try:
        with open(settings.PROJECTS_REGISTRY_FILE, 'w') as f:
            json.dump([], f) # Initialize with an empty list
    except Exception as e:
        print(f"Could not create initial empty projects registry: {e}")
