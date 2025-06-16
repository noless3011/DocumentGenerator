from typing import Dict, Optional, Annotated
from fastapi import Depends, HTTPException, status
from config import settings
from agents.IAgent import IAgent
from utils.Project import Project
from utils.ExcelFileHandler import ExcelFileHandler

app_state: dict = {
    "current_project": None,
    "agent_instances": {}, # For general purpose agents (Text, Diagram, Proto)
    "chat_agents": {}      # For ChatAgents, keyed by project_id
}
excel_handler = ExcelFileHandler()  # Global instance for Excel file handling
# --- Dependency Functions ---

def get_app_state() -> dict:
    """Returns the shared application state dictionary."""
    return app_state

def get_excel_handler() -> ExcelFileHandler:
    """Provides an instance of the ExcelFileHandler."""
    return excel_handler

def register_agent_instance(agent_name: str, agent: IAgent) -> None:
    """Registers a shared agent instance."""
    app_state["agent_instances"][agent_name] = agent
    print(f"Agent '{agent_name}' of type {type(agent).__name__} registered.")

def get_agent_instance(agent_name: str) -> IAgent:
    """Retrieves a registered shared agent instance."""
    agent = app_state["agent_instances"].get(agent_name)
    if not agent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Shared agent '{agent_name}' not found. Ensure it's registered at startup."
        )
    return agent

def get_chat_agent(project_id: str, state: Annotated[dict, Depends(get_app_state)]) -> Optional[IAgent]:
    """Retrieves the ChatAgent for a specific project_id."""
    chat_agent = state["chat_agents"].get(project_id)
    if not chat_agent:
        # Optionally, you could try to lazy-initialize it here if the project is loaded
        # but for WebSocket, it's better if it's already there from project load.
        print(f"Chat agent for project_id '{project_id}' not found in app_state.")
        return None
    return chat_agent


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
    return current_project

def get_optional_current_project(state: Annotated[dict, Depends(get_app_state)]) -> Optional[Project]:
    """Retrieves the current project if one is active, otherwise returns None."""
    return state.get("current_project")

# --- Functions to manage agent instances (can be called at app startup/shutdown) ---
def clear_all_agent_instances():
    app_state["agent_instances"].clear()
    app_state["chat_agents"].clear()
    print("All agent instances cleared.")

def remove_chat_agent_for_project(project_id: str):
    if project_id in app_state["chat_agents"]:
        del app_state["chat_agents"][project_id]
        print(f"Chat agent for project {project_id} removed.")
