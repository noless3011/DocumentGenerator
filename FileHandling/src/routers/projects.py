import os
import time
from typing import List, Annotated, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, Depends, status, Body, WebSocket, WebSocketDisconnect
from pathlib import Path

from datetime import datetime
from utils.Project import Project
from utils import RegistryHandler
from utils.WebSocketManager import project_socket_manager
from models import ProjectCreateRequest, ProjectInfo, ProjectListItem, SimpleStatusResponse, ErrorResponse
from dependencies import get_app_state, get_optional_current_project, remove_chat_agent_for_project, get_current_project
from agents.ChatAgent import ChatAgent # Import ChatAgent
from config import settings # For default model names

router = APIRouter(
    prefix="/projects",
    tags=["Projects"],
    responses={404: {"description": "Not found", "model": ErrorResponse}},
)

# WebSocket endpoint for general project updates (distinct from chat)
@router.websocket("/ws/{project_id}")
async def websocket_project_updates_endpoint(websocket: WebSocket, project_id: str):
    await project_socket_manager.connect(websocket, project_id)
    try:
        while True:
            # This connection is primarily for server-to-client project updates.
            # Client might send pings or specific requests, but main flow is broadcast.
            data = await websocket.receive_text()
            # Optionally handle client messages, e.g., pings or requests for full project refresh
            if data == "__ping__":
                await websocket.send_text("__pong__")
            # print(f"Received on project WebSocket for {project_id}: {data}") # For debugging
    except WebSocketDisconnect:
        project_socket_manager.disconnect(websocket, project_id)
        print(f"Project update WebSocket disconnected for project {project_id}")
    except Exception as e:
        print(f"Error in project update WebSocket for project {project_id}: {e}")
        project_socket_manager.disconnect(websocket, project_id)


@router.get("/list", response_model=List[ProjectListItem], summary="List all projects")
async def list_projects():
    projects_data = RegistryHandler.load_projects_registry()
    processed_projects = []
    for p_data in projects_data:
        if "project_dir_name" not in p_data or not p_data["project_dir_name"]:
            # Attempt to derive project_dir_name if missing or empty
            # This logic should ideally match how it's created in Project class or create_project route
            # Assuming project_dir is base_dir / (name_id_hex)
            # A more robust way would be to load the project's metadata if possible, but that's too heavy for a list.
            # Fallback: construct from name and id. This might not always be correct if naming convention changed.
            project_name_sanitized = p_data.get('name', 'Untitled').replace(' ', '_')
            project_id_hex = p_data.get('id', 'unknown')
            derived_project_dir_name = f"{project_name_sanitized}_{project_id_hex}"
            p_data["project_dir_name"] = derived_project_dir_name
            # Optionally, log this event: print(f"Warning: project_dir_name was missing for project {p_data.get('id')}. Derived as {derived_project_dir_name}")
        
        # Ensure base_dir is present, provide a default or skip if critical and missing
        if "base_dir" not in p_data or not p_data["base_dir"]:
            # Handle missing base_dir, e.g., by skipping or using a default placeholder
            # For now, let's assume it might cause an error downstream if truly missing and required by ProjectListItem
            # If ProjectListItem's base_dir is not optional, this will still fail here.
            # Consider making base_dir optional in ProjectListItem or ensuring it's always in the registry.
            print(f"Warning: base_dir was missing for project {p_data.get('id')}. This might lead to errors.")
            # To prevent validation error if base_dir is required and missing:
            # p_data["base_dir"] = "/tmp/unknown_base_dir" # Or some other placeholder
            # Or skip this item:
            # continue

        try:
            processed_projects.append(ProjectListItem(**p_data))
        except Exception as e:
            print(f"Error processing project data for list: {p_data.get('id')}, error: {e}. Skipping this entry.")
            # Log the problematic data for debugging
            print(f"Problematic data: {p_data}")
            continue # Skip entries that still fail validation after attempting to fix
            
    return processed_projects


@router.post("/create", response_model=ProjectInfo, status_code=status.HTTP_201_CREATED, summary="Create a new project")
async def create_project(
    request_data: ProjectCreateRequest,
    app_state: Annotated[Dict, Depends(get_app_state)]
):
    base_dir = Path(request_data.base_dir)
    project_name = request_data.project_name

    if not base_dir.exists():
        try:
            base_dir.mkdir(parents=True, exist_ok=True)
        except Exception as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Could not create base directory: {e}")
    elif not base_dir.is_dir():
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Base directory path exists but is not a directory: {base_dir}")

    # Close any currently active project before creating a new one
    if app_state.get("current_project"):
        await close_project_internal(app_state)

    project = Project(name=project_name, base_dir=str(base_dir))
    if not project.create_directory_structure():
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Failed to create project directory structure.")

    await project.scan_and_update_files() # Initial scan
    await project.save_metadata()

    app_state["current_project"] = project

    # Initialize ChatAgent for the new project
    chat_agent_model = settings.DEFAULT_CHAT_MODEL # Get model from config
    app_state.setdefault("chat_agents", {})[project.id] = ChatAgent(model=chat_agent_model, project=project)
    print(f"ChatAgent for project '{project.name}' ({project.id}) initialized.")

    print(f"Project '{project.name}' ({project.id}) created and set as current.")

    projects_registry = RegistryHandler.load_projects_registry()
    projects_registry.append({
        "id": project.id,
        "name": project.name,
        "base_dir": str(project.base_dir), # Use project.base_dir (absolute)
        "project_dir_name": os.path.basename(project.project_dir), # Store relative project folder name
        "created_date": project.created_date.isoformat(),
        "modified_date": project.modified_date.isoformat()
    })
    RegistryHandler.save_projects_registry(projects_registry)

    project_info_response = ProjectInfo(**project.to_dict())
    await project_socket_manager.broadcast(project.id, {"type":"project_loaded", "project_data": project_info_response.model_dump()})


    return project_info_response

@router.post("/create-output", response_model=SimpleStatusResponse, summary="Add a new output file")
async def add_output_file(
    current_project: Annotated[Project, Depends(get_current_project)],
    file_name: str = Body(..., embed=True),
    file_type: str = Body(..., embed=True),
    document_type: str = Body(..., embed=True),
    diagram_type: Optional[str] = Body(None, embed=True)
):
    """Create a new file with specified content in the input folder."""
    if not file_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File name must be provided")
    if not file_type:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File type must be provided")
    if not document_type:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Document type must be provided")
    if file_type not in ["input", "processed", "output"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="File type must be 'input', 'processed', or 'output'")
    if document_type not in ["markdown", "diagram", "html"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Document type must be 'markdown', 'diagram', or 'html'")
    
    # Ensure the target directory exists
    target_dir_path = Path(current_project.input_dir if file_type == "input" else 
                           current_project.processed_dir if file_type == "processed" else 
                           current_project.output_dir)
    target_dir_path.mkdir(parents=True, exist_ok=True)
      # The frontend already sends the filename with the correct extension, so we don't need to add it again
    concat_filename = file_name
    init_content = (
        "# New Document\n\n" if document_type == "markdown" else
        "<html><body><h1>New Document</h1></body></html>" if document_type == "html" else
'''{
  "diagramType": "''' + (diagram_type or "UML Class Diagram") + '''",
  "diagramName": "''' + file_name + '''",
  "classes": [],
  "relationships": []
}''' if document_type == "diagram" else
        ""
    )
    print(f"Creating file: {concat_filename} in {file_type} folder with initial content:\n{init_content}")
    current_project.create_file(
        file_name=concat_filename,
        file_type=file_type,
        content=init_content
    )
    return {
        "status": "success",
        "message": f"File '{concat_filename}' created successfully in {file_type} folder",
        "project_id": current_project.id,
        "file_name": concat_filename,
        "file_type": file_type,
        "document_type": document_type
    }

@router.post("/remove-output", response_model=SimpleStatusResponse, summary="Remove an output file")
async def remove_output_file(
    file_name: str = Body(..., embed=True, description="The name of the output file to remove."),
    current_project: Project = Depends(get_current_project)
):
    print(f"Attempting to remove output file: {file_name} from project {current_project.id}")
    success = await current_project.delete_file(file_name, file_type="output")

    if not success:
        # Check if file actually existed in the records
        if not any(f['name'] == file_name for f in current_project.files.get("output",[])):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Output file '{file_name}' not found in project records.")
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to delete output file '{file_name}'.")

    await current_project.save_metadata()
    # Broadcast is handled by delete_file
    return SimpleStatusResponse(status="success", message=f"Output file '{file_name}' removed successfully.")

@router.post("/rename-output", response_model=SimpleStatusResponse, summary="Rename an output file")
async def rename_output_file(
    old_file_name: str = Body(..., description="The current name of the output file."),
    new_file_name: str = Body(..., description="The new name for the output file."),
    current_project: Project = Depends(get_current_project)
):
    print(f"Attempting to rename output file: {old_file_name} to {new_file_name} in project {current_project.id}")
    success = await current_project.rename_file(old_file_name, new_file_name, file_type="output")

    if not success:
        # Add more specific error checking if needed (e.g., if old_file_name didn't exist)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to rename output file '{old_file_name}' to '{new_file_name}'. Check if the file exists or if the new name is valid/available.")

    await current_project.save_metadata()
    # Broadcast is handled by rename_file
    return SimpleStatusResponse(status="success", message=f"Output file '{old_file_name}' renamed to '{new_file_name}' successfully.")

@router.post("/load/{project_id}", response_model=ProjectInfo, summary="Load an existing project")
async def load_project(
    project_id: str,
    app_state: Annotated[Dict, Depends(get_app_state)]
):
    projects_registry = RegistryHandler.load_projects_registry()
    project_info_from_registry = next((p for p in projects_registry if p["id"] == project_id), None)

    if not project_info_from_registry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Project not found in registry")

    # Close current project if it's different from the one being loaded
    current_project_in_state: Optional[Project] = app_state.get("current_project")
    if current_project_in_state and current_project_in_state.id != project_id:
         await close_project_internal(app_state) # This will also clear its chat agent

    # Construct expected metadata path
    base_dir_str = project_info_from_registry["base_dir"]
    # project_name_from_registry = project_info_from_registry["name"]
    # project_folder_name = f"{project_name_from_registry.replace(' ', '_')}_{project_id}"
    project_folder_name = project_info_from_registry["project_dir_name"]
    project_directory_path = Path(base_dir_str) / project_folder_name
    metadata_file_path = project_directory_path / "project_metadata.json"

    if not metadata_file_path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project metadata file not found at: {metadata_file_path}"
        )

    loaded_project = Project.load_from_metadata(str(metadata_file_path))
    if not loaded_project:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Error loading project from {metadata_file_path}")

    if loaded_project.id != project_id: # Sanity check
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Project ID mismatch after loading.")

    app_state["current_project"] = loaded_project

    # Initialize or ensure ChatAgent exists for the loaded project
    if project_id not in app_state.get("chat_agents", {}):
        chat_agent_model = settings.DEFAULT_CHAT_MODEL
        app_state.setdefault("chat_agents", {})[project_id] = ChatAgent(model=chat_agent_model, project=loaded_project)
        print(f"ChatAgent for project '{loaded_project.name}' ({project_id}) initialized upon load.")
    else: # If chat agent exists, update its project reference and context
        chat_agent_instance = app_state["chat_agents"][project_id]
        chat_agent_instance.update_context(loaded_project) # Ensure it has the latest project object and context
        print(f"ChatAgent for project '{loaded_project.name}' ({project_id}) re-synced upon load.")


    print(f"Project '{loaded_project.name}' ({loaded_project.id}) loaded and set as current.")

    # Perform a fresh scan and save to ensure consistency, then broadcast
    await loaded_project.scan_and_update_files()
    await loaded_project.save_metadata()

    project_info_response = ProjectInfo(**loaded_project.to_dict())
    # Broadcast that this project is now loaded/active.
    # Clients connected to this project_id's WebSocket will receive this.
    await project_socket_manager.broadcast(loaded_project.id, {"type":"project_loaded", "project_data": project_info_response.model_dump()})

    return project_info_response


@router.post("/close", response_model=SimpleStatusResponse, summary="Close the current project")
async def close_project_endpoint( # Renamed to avoid conflict with internal helper
    app_state: Annotated[Dict, Depends(get_app_state)]
):
    closed_project_id = await close_project_internal(app_state)
    if closed_project_id:
        # Broadcast a specific message indicating project closure for this ID
        await project_socket_manager.broadcast(closed_project_id, {"type": "project_closed", "project_id": closed_project_id})
        return SimpleStatusResponse(status="success", message="Project closed successfully")
    return SimpleStatusResponse(status="info", message="No active project to close.")


@router.get("/details", response_model=ProjectInfo, summary="Get details of the current project")
async def get_project_details(
    current_project: Project = Depends(get_current_project) # Ensures a project is active
):
    await current_project.scan_and_update_files() # Refresh file list before sending details
    # The to_dict() method now includes requirements and tech_stack from context
    return ProjectInfo(**current_project.to_dict())


# --- Internal Helper Functions ---
async def close_project_internal(app_state: dict) -> Optional[str]:
    """Internal logic to close the project. Returns closed project ID or None."""
    project_to_close: Optional[Project] = app_state.get("current_project")

    if not project_to_close:
        print("No project was active to close.")
        return None

    closed_project_id = project_to_close.id
    print(f"Closing project: {project_to_close.name} ({closed_project_id})")

    project_to_close.modified_date = datetime.now()
    await project_to_close.scan_and_update_files() # Ensure files are up-to-date before final save
    await project_to_close.save_metadata()

    projects_registry = RegistryHandler.load_projects_registry()
    for p_reg_info in projects_registry:
        if p_reg_info["id"] == closed_project_id:
            p_reg_info["modified_date"] = project_to_close.modified_date.isoformat()
            RegistryHandler.save_projects_registry(projects_registry)
            break

    app_state["current_project"] = None
    remove_chat_agent_for_project(closed_project_id) # Remove associated chat agent

    print(f"Project {closed_project_id} closed and state cleared.")
    return closed_project_id
