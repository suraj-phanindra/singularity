import os
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routes import router, init_retrieval_agent

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="Singularity Backend",
    description="AI context aggregation backend using LlamaIndex and Claude",
    version="0.1.0"
)

# Configure CORS for extension communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to specific extension IDs
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routes
app.include_router(router)


@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    print("Starting Singularity Backend...")

    # Get API keys
    anthropic_key = os.getenv("ANTHROPIC_API_KEY")
    voyage_key = os.getenv("VOYAGE_API_KEY")

    if not anthropic_key:
        print("WARNING: ANTHROPIC_API_KEY not found in environment")
    if not voyage_key:
        print("WARNING: VOYAGE_API_KEY not found in environment")

    # Initialize retrieval agent
    if anthropic_key and voyage_key:
        init_retrieval_agent(anthropic_key, voyage_key)
        print("Retrieval agent initialized")
    else:
        print("WARNING: Cannot initialize retrieval agent without API keys")

    print("Backend ready!")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "name": "Singularity Backend",
        "version": "0.1.0",
        "status": "running"
    }


if __name__ == "__main__":
    import uvicorn

    host = os.getenv("HOST", "localhost")
    port = int(os.getenv("PORT", 8000))

    print(f"Starting server on {host}:{port}")

    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )
