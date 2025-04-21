# dependencies.py
from typing import Optional, Annotated
from fastapi import Depends, HTTPException, status

from config import settings
from agents.DocumentGeneration import GeneralAgent
from utils.Project import Project
from utils.ExcelFileHandler import ExcelFileHandler

# --- Application State ---
# Simple dictionary to hold shared state like the current project.
# In a larger application, consider a more robust state management class.
app_state: dict = {"current_project": None}

# --- Dependency Functions ---

def get_app_state() -> dict:
    """Returns the shared application state dictionary."""
    return app_state

def get_excel_handler() -> ExcelFileHandler:
    """Provides an instance of the ExcelFileHandler."""
    # Could add configuration here if needed
    return ExcelFileHandler()

# Store the generator instance globally within this module
# It needs to be updated when the project changes
_generator_instance: Optional[GeneralAgent] = None

def get_generator_instance(state: Annotated[dict, Depends(get_app_state)]) -> GeneralAgent:
    """
    Provides the GeneralAgent instance, initializing or updating it
    based on the current project in the app state.
    """
    global _generator_instance
    current_project: Optional[Project] = state.get("current_project")

    if _generator_instance is None:
        print("Initializing GeneralAgent...")
        _generator_instance = GeneralAgent(api_key=settings.GOOGLE_API_KEY, project=current_project)
        if current_project:
             _generator_instance.initialize_message() # Initialize only if project exists
    elif _generator_instance.project != current_project:
         print(f"Changing project for GeneralAgent to: {current_project.name if current_project else 'None'}")
         _generator_instance.change_project(current_project)
         if current_project:
             _generator_instance.initialize_message() # Re-initialize message for new project

    return _generator_instance

def get_current_project(state: Annotated[dict, Depends(get_app_state)]) -> Project:
    """
    Dependency that retrieves the current project from the app state.
    Raises an HTTPException if no project is active.
    """
    current_project = state.get("current_project")
    if current_project is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No active project. Please create or load a project first."
        )
    # Optionally refresh project state if needed (e.g., rescan files)
    # current_project.scan_and_update_files()
    return current_project

# Dependency for routes that *don't* strictly require an active project
# but might use it if available (e.g., list projects)
def get_optional_current_project(state: Annotated[dict, Depends(get_app_state)]) -> Optional[Project]:
    """Retrieves the current project if one is active, otherwise returns None."""
    return state.get("current_project")