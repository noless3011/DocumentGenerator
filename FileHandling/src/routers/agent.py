# routers/generation.py
import os
from typing import Annotated, Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import HTMLResponse, FileResponse
from pathlib import Path

from utils.Project import Project
from agents import TextDocumentAgent, DiagramAgent, PrototypeAgent
from models import (
    GenerationResponse, TextGenerationResponse, ErrorResponse,
    SimpleStatusResponse
)
from dependencies import get_current_project, get_agent_with_type
from dependencies import add_agent_instance, get_agent_instance, remove_agent_instance
from fastapi import Body

router = APIRouter(
    prefix="/agent",
    tags=["Generation"],
    responses={404: {"description": "Not found", "model": ErrorResponse}},
)

@router.post("/add")
def add_agent(
    agent_name: str = Body(..., embed=True, description="Name of the agent"),
    agent_type: str = Body(..., embed=True, description="Type of the agent"),
    model: str = Body(..., embed=True, description="Model name"),
    project: Project = Depends(get_current_project),
) -> SimpleStatusResponse:
    """
    Add an agent instance to the global dictionary.
    """
    if agent_name in get_agent_with_type(agent_type):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Agent '{agent_name}' already exists."
        )
    
    if agent_type == "TextDocumentAgent":
        agent = TextDocumentAgent(agent_name, model, project)
    elif agent_type == "DiagramAgent":
        agent = DiagramAgent(agent_name, model, project)
    elif agent_type == "PrototypeAgent":
        agent = PrototypeAgent(agent_name, model, project)
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported agent type '{agent_type}'."
        )
    
    add_agent_instance(agent_name, agent)
    
    return SimpleStatusResponse(status="success", message=f"Agent '{agent_name}' added successfully.")

@router.get("/list-agents-with-type/{agent_type}")
def list_agents_with_type(
    agent_type: str
) -> List[str]:
    """
    List all agent instances of a specific type.
    """
    agents = get_agent_with_type(agent_type)
    return [agent.name for agent in agents.values()]

@router.post("/delete/{agent_name}")
def delete_agent(
    agent_name: str,
) -> SimpleStatusResponse:
    """
    Delete an agent instance from the global dictionary.
    """
    remove_agent_instance(agent_name)
    return SimpleStatusResponse(status="success", message=f"Agent '{agent_name}' deleted successfully.")

@router.post("/clear-all")
def clear_all_agents() -> SimpleStatusResponse:
    """
    Clear all agent instances from the global dictionary.
    """
    remove_agent_instance()
    return SimpleStatusResponse(status="success", message="All agents cleared successfully.")

@router.post("/generate/{agent_name}")
def generate_text_document(
    agent_name: str,
    project: Project = Depends(get_current_project)
) -> TextGenerationResponse:
    """
    Generate a text document using the specified agent.
    """
    agent = get_agent_instance(agent_name)
    
    if agent is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent '{agent_name}' not found."
        )
    
    if not isinstance(agent, TextDocumentAgent):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Agent '{agent_name}' is not a TextDocumentAgent."
        )
    
    # Generate the document
    document = agent.generate(project.context)
    
    if document is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate document with agent '{agent_name}'."
        )
    
    # Update the context with the generated document
    agent.update_context(project.context)
    
    return TextGenerationResponse(
        status="success",
        document=document,
        agent_name=agent_name
    )

@router.post("/edit/{agent_name}")
def edit_document(
    agent_name: str,
    prompt: str = Body(..., embed=True, description="Prompt for editing"),
    attached_context: str = Body(..., embed=True, description="Context to attach to the document"),
    project: Project = Depends(get_current_project)
) -> TextGenerationResponse:
    """
    Edit a document using the specified agent.
    """
    agent = get_agent_instance(agent_name)
    
    if agent is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Agent '{agent_name}' not found."
        )
    
    # Edit the document
    edited_document = agent.edit(prompt, attached_context, project.context)
    
    if edited_document is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to edit document with agent '{agent_name}'."
        )
    
    # Update the context with the edited document
    agent.update_context(project.context)
    
    return TextGenerationResponse(
        status="success",
        document=edited_document,
        agent_name=agent_name
    )