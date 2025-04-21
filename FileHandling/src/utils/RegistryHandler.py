# utils/RegistryHandler.py
import json
from pathlib import Path
from typing import List, Dict, Any
from config import settings # Import the settings instance

def save_projects_registry(projects_list: List[Dict[str, Any]]):
    """Save projects list to registry file."""
    try:
        with open(settings.PROJECTS_REGISTRY_FILE, 'w', encoding='utf-8') as f:
            json.dump(projects_list, f, indent=4)
    except Exception as e:
        print(f"Error writing projects registry: {e}")
        # Consider more robust error handling/logging

def load_projects_registry() -> List[Dict[str, Any]]:
    """Load projects list from registry file."""
    if not settings.PROJECTS_REGISTRY_FILE.exists():
        return []
    try:
        with open(settings.PROJECTS_REGISTRY_FILE, 'r', encoding='utf-8') as f:
            content = f.read()
            if not content: # Handle empty file case
                return []
            return json.loads(content)
    except json.JSONDecodeError as e:
        print(f"Error decoding projects registry JSON: {e}")
        # Optionally: backup the corrupt file and return empty list
        return []
    except Exception as e:
        print(f"Error reading projects registry: {e}")
        return []