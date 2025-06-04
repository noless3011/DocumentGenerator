import uvicorn
from datetime import datetime
from fastapi import FastAPI, Request, Response, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import sys
import os

# Add the src directory to Python path for absolute imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from config import settings
from dependencies import app_state, register_agent_instance, clear_all_agent_instances
from routers import projects, files, chat, serve

# Import Agent classes for registration
from agents.TextDocumentAgent import TextDocumentAgent
from agents.DiagramAgent import DiagramAgent
from agents.PrototypeAgent import PrototypeAgent
# ChatAgent is managed per project, not globally registered in the same way

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Register shared agent instances
    print("Application startup: Registering shared agents...")
    
    try:
        text_agent = TextDocumentAgent(model=settings.DEFAULT_TEXT_AGENT_MODEL, project=None)
        register_agent_instance(settings.DEFAULT_TEXT_AGENT_NAME, text_agent)

        diagram_agent = DiagramAgent(model=settings.DEFAULT_DIAGRAM_AGENT_MODEL, project=None)
        register_agent_instance(settings.DEFAULT_DIAGRAM_AGENT_NAME, diagram_agent)

        prototype_agent = PrototypeAgent(model=settings.DEFAULT_PROTOTYPE_AGENT_MODEL, project=None)
        register_agent_instance(settings.DEFAULT_PROTOTYPE_AGENT_NAME, prototype_agent)
        print("Shared agents registered.")
    except TypeError as te:
        print(f"Error registering shared agents: {te}. This might be due to agent constructors requiring a Project instance. Consider refactoring shared agent constructors.")
    except Exception as e:
        print(f"An unexpected error occurred during shared agent registration: {e}")


    yield
    # Shutdown
    print("Application shutdown: Clearing agent instances...")
    clear_all_agent_instances()
    # dummy_project.create_directory_structure() # cleanup dummy if created
    # shutil.rmtree(dummy_project.project_dir, ignore_errors=True)

app = FastAPI(
    title="Document Generation API",
    description="API for managing projects, processing Excel files, and generating documents using AI.",
    version="1.1.0", # Incremented version
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173", "http://127.0.0.1:3000", "http://127.0.0.1:5173"], # Added common Vite port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# CSP Middleware (consider if needed for your deployment)
# @app.middleware("http")
# async def add_csp_header_middleware(request: Request, call_next):
#     response: Response = await call_next(request)
#     # ... CSP header setting ... (ensure connect-src includes ws:// and wss:// for your chat port)
#     return response

# Basic error handler for debugging (can be removed in production)
# @app.exception_handler(Exception)
# async def debug_exception_handler(request: Request, exc: Exception):
#     import traceback
#     return Response(
#         content="".join(traceback.format_exception(type(exc), exc, exc.__traceback__)),
#         status_code=500
#     )

app.include_router(projects.router)
app.include_router(files.router)
app.include_router(chat.router)
app.include_router(serve.router)

@app.get("/", tags=["Root"], summary="API Root")
async def read_root():
    return {"message": "Welcome to the Document Generation API v1.1.0"}

@app.get("/health", tags=["Health"], summary="Health Check")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

if __name__ == "__main__":
    print(f"Starting Uvicorn server on http://127.0.0.1:5000")
    uvicorn.run("main:app", host="127.0.0.1", port=5000, reload=True)
