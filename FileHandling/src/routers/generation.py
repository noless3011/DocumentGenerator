# routers/generation.py
import os
from typing import Annotated, Dict, Any, List
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import HTMLResponse, FileResponse
from pathlib import Path

from agents.DocumentGeneration import DocumentType
from utils.Project import Project
from agents.DocumentGeneration import GeneralAgent
from models import (
    GenerationResponse, TextGenerationResponse, ErrorResponse,
    SimpleStatusResponse
)
from dependencies import get_current_project, get_generator_instance

router = APIRouter(
    prefix="/generate",
    tags=["Generation"],
    responses={404: {"description": "Not found", "model": ErrorResponse}},
)


@router.get("/current-message", response_model=List[Dict[str, Any]], summary="Get initial/current agent message")
async def get_current_message(
    current_project: Annotated[Project, Depends(get_current_project)], # Ensures project exists
    generator: Annotated[GeneralAgent, Depends(get_generator_instance)]
):
    """
    Retrieves the current conversation history or initial message
    from the document generation agent for the active project.
    """
    if not generator.init_message:
        # This might happen if initialization failed or project wasn't set correctly
        # The dependency should handle initialization, but double-check
        generator.initialize_message()
        if not generator.init_message:
             raise HTTPException(
                 status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                 detail="Agent message could not be initialized."
            )

    return generator.init_message.get_conversation()


@router.post("/all-documents", response_model=SimpleStatusResponse, summary="Generate all standard documents")
async def generate_all_documents(
    current_project: Annotated[Project, Depends(get_current_project)],
    generator: Annotated[GeneralAgent, Depends(get_generator_instance)]
):
    """
    Generates the standard set of documents (Markdown text, HTML prototype, JSON class diagram)
    based on the processed project inputs.
    """
    output_dir = Path(current_project.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True) # Ensure dir exists
    output_files_generated = []

    try:
        # 1. Generate Text Document (Markdown)
        print("Generating text document...")
        md_content = generator.generate_document(DocumentType.TEXT_DOCUMENT)
        md_output_file = output_dir / "generated_document.md"
        generator.save_document(md_content, str(md_output_file))
        output_files_generated.append({"path": str(md_output_file), "name": md_output_file.name})
        print(f"Saved: {md_output_file}")

        # 2. Generate HTML Prototype
        print("Generating HTML prototype...")
        html_content = generator.generate_document(DocumentType.PROTOTYPE)
        html_output_file = output_dir / "preview_app.html"
        generator.save_document(html_content, str(html_output_file))
        output_files_generated.append({"path": str(html_output_file), "name": html_output_file.name})
        print(f"Saved: {html_output_file}")

        # 3. Generate Class Diagram (JSON)
        print("Generating class diagrams...")
        json_content = generator.generate_document(DocumentType.CLASS_DIAGRAM)
        json_output_file = output_dir / "class_diagram.json"
        generator.save_json(json_content, str(json_output_file))
        output_files_generated.append({"path": str(json_output_file), "name": json_output_file.name})
        print(f"Saved: {json_output_file}")

        # Add processing record
        current_project.add_processing_record(
            operation="generate_all_documents",
            # Log relevant input types (processed files are likely the direct input)
            input_files=current_project.files.get("processed", []) + current_project.files.get("input", []),
            output_files=output_files_generated,
            details={}
        )
        # Add files to project metadata under 'output' type
        for f_info in output_files_generated:
             current_project.add_file(f_info['path'], "output")

        current_project.save_metadata()

        return SimpleStatusResponse(
            status="success",
            message=f"Successfully generated {len(output_files_generated)} documents."
        )

    except Exception as e:
        # Log the error for debugging
        print(f"Error during /generate/all-documents: {e}")
        # Potentially add partial results to processing record if needed
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred during document generation: {e}"
        )


@router.post("/text-document", response_model=TextGenerationResponse, summary="Generate Markdown document")
async def generate_text_document(
    current_project: Annotated[Project, Depends(get_current_project)],
    generator: Annotated[GeneralAgent, Depends(get_generator_instance)]
):
    """Generates a Markdown text document based on project inputs."""
    output_dir = Path(current_project.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / "generated_document.md"

    try:
        print("Generating text document...")
        document_content = generator.generate_text_document() # Assuming async
        generator.save_document(document_content, str(output_file))
        print(f"Saved: {output_file}")

        # Add record and file metadata
        file_info = {"path": str(output_file), "name": output_file.name}
        current_project.add_processing_record(
            operation="generate_text_document",
            input_files=current_project.files.get("processed", []) + current_project.files.get("input", []),
            output_files=[file_info],
            details={}
        )
        current_project.add_file(file_info['path'], "output")
        current_project.save_metadata()

        return TextGenerationResponse(
            status="success",
            message="Text document generated successfully",
            dir=str(output_file)
        )
    except Exception as e:
        print(f"Error in /generate-text-document: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/class-diagram", response_model=TextGenerationResponse, summary="Generate JSON class diagram")
async def generate_class_diagram(
    current_project: Annotated[Project, Depends(get_current_project)],
    generator: Annotated[GeneralAgent, Depends(get_generator_instance)]
):
    """Generates a class diagram representation in JSON format."""
    output_dir = Path(current_project.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / "class_diagram.json"

    try:
        print("Generating class diagram...")
        class_diagram = generator.generate_class_diagram() # Assuming async
        generator.save_json(class_diagram, str(output_file))
        print(f"Saved: {output_file}")

        # Add record and file metadata
        file_info = {"path": str(output_file), "name": output_file.name}
        current_project.add_processing_record(
            operation="generate_class_diagram",
            input_files=current_project.files.get("processed", []) + current_project.files.get("input", []),
            output_files=[file_info],
            details={}
        )
        current_project.add_file(file_info['path'], "output")
        current_project.save_metadata()

        return TextGenerationResponse(
            status="success",
            message="Class diagram generated successfully",
            dir=str(output_file)
        )
    except Exception as e:
        print(f"Error in /generate-class-diagram: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# --- Placeholder Endpoints ---

@router.post("/usecase-diagram", summary="Generate Usecase Diagram (Not Implemented)")
async def generate_usecase_diagram(
    current_project: Annotated[Project, Depends(get_current_project)],
    generator: Annotated[GeneralAgent, Depends(get_generator_instance)]
):
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Usecase diagram generation not yet implemented")

@router.post("/database-diagram", summary="Generate Database Diagram (Not Implemented)")
async def generate_database_diagram(
    current_project: Annotated[Project, Depends(get_current_project)],
    generator: Annotated[GeneralAgent, Depends(get_generator_instance)]
):
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Database diagram generation not yet implemented")


# --- Preview App ---

@router.post("/preview-app", response_model=GenerationResponse, summary="Generate HTML prototype/preview")
async def generate_preview_app(
    current_project: Annotated[Project, Depends(get_current_project)],
    generator: Annotated[GeneralAgent, Depends(get_generator_instance)]
):
    """Generates an HTML preview/prototype based on project inputs."""
    output_dir = Path(current_project.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    output_file = output_dir / "preview_app.html" # Consistent name

    try:
        print("Generating preview app (HTML)...")
        html_content = generator.generate_prototype()
        generator.save_html(html_content, str(output_file))
        print(f"Saved: {output_file}")

        # Add record and file metadata
        file_info = {"path": str(output_file), "name": output_file.name}
        current_project.add_processing_record(
            operation="generate_preview_app",
            input_files=current_project.files.get("processed", []) + current_project.files.get("input", []),
            output_files=[file_info],
            details={}
        )
        current_project.add_file(file_info['path'], "output")
        current_project.save_metadata()

        return GenerationResponse(
            status="success",
            message="Preview app generated successfully",
            name=output_file.name
        )
    except Exception as e:
        print(f"Error in /generate-preview-app: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/preview", response_class=HTMLResponse, summary="Serve the generated HTML preview")
async def serve_preview_app(
    current_project: Annotated[Project, Depends(get_current_project)]
):
    """Serves the 'preview_app.html' file from the current project's output directory."""
    preview_app_path = Path(current_project.output_dir) / "preview_app.html"

    if not preview_app_path.exists():
        # Maybe try generating it first? Or just return 404.
        # Let's stick to 404 as the endpoint is just for serving.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Preview app ('preview_app.html') not found. Generate it first using the '/generate/preview-app' endpoint."
        )

    # Return the file content as HTMLResponse
    # For larger files, consider FileResponse, but HTMLResponse reads it into memory
    try:
        return HTMLResponse(content=preview_app_path.read_text(encoding='utf-8'))
    except Exception as e:
         raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Could not read preview file: {e}"
        )

# Example of serving a specific generated file using FileResponse
@router.get("/download/{filename}", summary="Download a generated output file")
async def download_output_file(
    filename: str,
    current_project: Annotated[Project, Depends(get_current_project)]
):
    """Downloads a specific file from the project's output directory."""
    output_dir = Path(current_project.output_dir)
    file_path = output_dir / filename

    # Security check: Ensure the filename doesn't try to escape the output directory
    if not filename or ".." in filename or filename.startswith("/"):
         raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid filename.")

    # Check if the file exists within the project's output files
    output_files = current_project.files.get("output", [])
    if not any(f['name'] == filename and Path(f['path']) == file_path for f in output_files):
         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"File '{filename}' not found in project outputs.")

    if not file_path.is_file():
        # This case should ideally be covered by the check above, but good failsafe
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"File '{filename}' not found on disk.")

    return FileResponse(path=file_path, filename=filename, media_type='application/octet-stream') # Force download