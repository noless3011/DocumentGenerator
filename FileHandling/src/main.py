# main.py
from FileHandling.src.routers import agent
import uvicorn
from fastapi import FastAPI, Request, Response, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import settings # Import shared settings
from dependencies import app_state # Import shared state
from routers import projects, files # Import routers
# --- Lifespan Management (Optional but good practice) ---
# Use lifespan events for setup/teardown if needed (e.g., database connections)
# @asynccontextmanager
# async def lifespan(app: FastAPI):
#     # Code to run on startup
#     print("Application startup...")
#     # Initialize database connections, load models, etc.
#     yield
#     # Code to run on shutdown
#     print("Application shutdown...")
#     # Clean up resources, close connections


# --- FastAPI App Initialization ---
# app = FastAPI(lifespan=lifespan) # Use lifespan if defined above
app = FastAPI(
    title="Document Generation API",
    description="API for managing projects, processing Excel files, and generating documents using AI.",
    version="1.0.0",
)


# --- CORS Middleware ---
# Allows requests from your frontend (e.g., Electron app, web browser)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5000", "http://127.0.0.1:5000", "http://localhost:3000"], # Be more specific in production (e.g., ["http://localhost:3000", "file://*"])
    allow_credentials=True,
    allow_methods=["*"], # Allows all methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"], # Allows all headers
)

# --- Content Security Policy (CSP) Middleware ---
@app.middleware("http")
async def add_csp_header_middleware(request: Request, call_next):
    """Adds Content-Security-Policy header to responses."""
    response: Response = await call_next(request)
    # Apply CSP mainly to HTML responses, adjust if needed for other types
    # Check if the route is likely to serve HTML (e.g., /generate/preview)
    # Or apply generally if Electron security model requires it everywhere.
    # For simplicity, let's apply it generally but be mindful of potential side effects.
    # if "text/html" in response.headers.get("content-type", ""):
    print(f"Applying CSP header for request path: {request.url.path}")
    csp = (
        "default-src 'self' data:; "
        # Allow scripts from self, inline, and eval (consider reducing 'unsafe-eval' if possible)
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        # Allow inline styles
        "style-src 'self' 'unsafe-inline'; "
         # Allow connections back to self (API) and potentially file protocol if scripts need it
        "connect-src 'self' http://localhost:5000 http://127.0.0.1:5000 file:; " # Adjusted connect-src
        # Allow framing by self (adjust if Electron needs different source)
        "frame-src 'self'; "
        # Allow images from self, data URIs, and blobs
        "img-src 'self' data: blob:; "
        # Allow forms to submit to self
        "form-action 'self';"
        # Explicitly disallow framing by others if needed (frame-src handles 'self' already)
        # "frame-ancestors 'none';" # Use if you don't want *any* framing
        # "frame-ancestors 'self';" # Allow only self-framing (might cover file://)
    )
    print(f"Setting CSP: {csp}")
    response.headers['Content-Security-Policy'] = csp
    return response

@app.exception_handler(Exception)
async def debug_exception_handler(request: Request, exc: Exception):
    import traceback

    return Response(
        content="".join(
            traceback.format_exception(
                etype=type(exc), value=exc, tb=exc.__traceback__
            )
        )
    )
# --- Include Routers ---
app.include_router(projects.router)
app.include_router(files.router)
app.include_router(agent.router)


# --- Basic Root and Health Check ---
@app.get("/", tags=["Root"], summary="API Root")
async def read_root():
    """Provides a simple welcome message for the API root."""
    return {"message": "Welcome to the Document Generation API"}

@app.get("/health", tags=["Health"], summary="Health Check")
async def health_check():
    """Simple health check endpoint to verify the API is running."""
    # Can be expanded to check database connections, external services, etc.
    return {"status": "ok"}


# --- Run the application ---
if __name__ == "__main__":
    print(f"Starting Uvicorn server on http://0.0.0.0:5000")
    # Use reload=True for development, disable in production
    # turn on debug=True for more verbose output
    uvicorn.run("main:app", host="0.0.0.0", port=5000, reload=True)