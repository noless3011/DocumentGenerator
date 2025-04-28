# dependencies.py
from typing import Dict, Optional, Annotated
from fastapi import Depends, HTTPException, status

from config import settings
from agents.IAgent import IAgent
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

# Store the agent instance globally within this module, the user can add multiple instances of the same agent type but with different names
_agent_instances: Dict[str, IAgent] = {}

def add_agent_instance(agent_name: str, agent: IAgent) -> None:
    """Adds a agent instance to the global dictionary."""
    _agent_instances[agent_name] = agent

def get_agent_instance(agent_name: str) -> IAgent:
    """Retrieves a agent instance from the global dictionary."""
    if agent_name not in _agent_instances:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"agent '{agent_name}' not found."
        )
    return _agent_instances[agent_name]

def remove_agent_instance(agent_name: str) -> None:
    """Removes a agent instance from the global dictionary."""
    if agent_name in _agent_instances:
        del _agent_instances[agent_name]

def get_agent_with_type(agent_type: type) -> Dict[IAgent]:
    """Retrieves all agent instances of a specific type from the global dictionary."""
    return {name: agent for name, agent in _agent_instances.items() if isinstance(agent, agent_type)}  

def clear_agent_instances() -> None:
    """Clears all agent instances from the global dictionary."""
    _agent_instances.clear()



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