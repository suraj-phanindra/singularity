#!/usr/bin/env python3
"""
Singularity Backend Runner
Quick start script for development
"""
import os
import sys


def check_env():
    """Check if .env file exists"""
    if not os.path.exists('.env'):
        print("WARNING: .env file not found!")
        print("Please create a .env file with your API keys:")
        print("  cp .env.example .env")
        print("  # Then edit .env with your actual keys")
        sys.exit(1)

    # Check for API keys
    from dotenv import load_dotenv
    load_dotenv()

    if not os.getenv('ANTHROPIC_API_KEY'):
        print("ERROR: ANTHROPIC_API_KEY not set in .env file")
        sys.exit(1)

    if not os.getenv('VOYAGE_API_KEY'):
        print("ERROR: VOYAGE_API_KEY not set in .env file")
        sys.exit(1)

    print("✓ Environment variables configured")


def main():
    """Run the backend server"""
    print("=" * 50)
    print("Singularity Backend - Starting...")
    print("=" * 50)

    check_env()

    print("\nStarting FastAPI server...")
    print("Server will be available at: http://localhost:8000")
    print("API docs available at: http://localhost:8000/docs")
    print("\nPress CTRL+C to stop\n")

    # Import and run
    import uvicorn
    from dotenv import load_dotenv

    load_dotenv()

    host = os.getenv("HOST", "localhost")
    port = int(os.getenv("PORT", 8000))

    uvicorn.run(
        "main:app",
        host=host,
        port=port,
        reload=True,
        log_level="info"
    )


if __name__ == "__main__":
    main()
