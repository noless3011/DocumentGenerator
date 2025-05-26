
import uvicorn
from fastapi import FastAPI, Request, Response, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from config import settings 
from dependencies import app_state
from routers import projects, files, chat 


app = FastAPI(
    title="Document Generation API",
    description="API for managing projects, processing Excel files, and generating documents using AI.",
    version="1.0.0"

)




app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000", "http://127.0.0.1:3000"],  
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)


@app.middleware("http")
async def add_csp_header_middleware(request: Request, call_next):
    """Adds Content-Security-Policy header to responses."""
    response: Response = await call_next(request)
    print(f"Applying CSP header for request path: {request.url.path}")
    csp = (
        "default-src 'self' data:; "
        
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
        
        "style-src 'self' 'unsafe-inline'; "
         
        "connect-src 'self' http://localhost:5000 http://127.0.0.1:5000 ws://localhost:5000 wss://localhost:5000 file: ; " 
        
        "frame-src 'self'; "
        
        "img-src 'self' data: blob:; "
        
        "form-action 'self';"
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
                type(exc), exc, exc.__traceback__
            )
        )
    )
app.include_router(projects.router)
app.include_router(files.router)
app.include_router(chat.router) 


@app.get("/", tags=["Root"], summary="API Root")
async def read_root():
    """Provides a simple welcome message for the API root."""
    return {"message": "Welcome to the Document Generation API"}

@app.get("/health", tags=["Health"], summary="Health Check")
async def health_check():
    """Simple health check endpoint to verify the API is running."""
    return {"status": "ok"}



if __name__ == "__main__":
    print(f"Starting Uvicorn server on http://127.0.0.1:5000")
    
    
    uvicorn.run("main:app", host="127.0.0.1", port=5000, reload=True)

