import time
from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    ExtractionRequest,
    ExtractionResponse,
    RetrievalRequest,
    RetrievalResponse,
    HealthResponse
)
from app.agents.extraction_agent import extract_context
from app.agents.retrieval_agent import ContextRetrievalAgent


router = APIRouter()

# Global retrieval agent instance (in-memory for MVP)
retrieval_agent = None


def init_retrieval_agent(anthropic_key: str, voyage_key: str):
    """Initialize the retrieval agent"""
    global retrieval_agent
    retrieval_agent = ContextRetrievalAgent(
        anthropic_api_key=anthropic_key,
        voyage_api_key=voyage_key
    )


@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        version="0.1.0",
        backends={
            "anthropic": "connected" if retrieval_agent else "not initialized",
            "voyage": "connected" if retrieval_agent else "not initialized"
        }
    )


@router.post("/api/extract", response_model=ExtractionResponse)
async def extract_endpoint(request: ExtractionRequest):
    """Extract context from a conversation message"""
    start_time = time.time()

    try:
        # Get API key from environment (passed via dependency injection)
        import os
        anthropic_key = os.getenv("ANTHROPIC_API_KEY")

        if not anthropic_key:
            raise HTTPException(status_code=500, detail="ANTHROPIC_API_KEY not configured")

        # Extract facts
        facts = await extract_context(request.message, anthropic_key)

        # Add facts to retrieval agent cache (with deduplication)
        # Only return facts that were actually added after deduplication
        added_facts = []
        if retrieval_agent:
            facts_dict = [fact.dict() for fact in facts]
            added_facts_dict = retrieval_agent.add_facts(facts_dict)

            # Convert back to Fact objects
            from app.models.schemas import Fact
            added_facts = [Fact(**fact_dict) for fact_dict in added_facts_dict]
        else:
            # If no retrieval agent, return all extracted facts
            added_facts = facts

        processing_time = time.time() - start_time

        return ExtractionResponse(
            success=True,
            facts=added_facts,  # Return only deduplicated facts
            processingTime=processing_time
        )

    except Exception as e:
        print(f"Extraction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/retrieve", response_model=RetrievalResponse)
async def retrieve_endpoint(request: RetrievalRequest):
    """Retrieve relevant context for a query"""

    try:
        if not retrieval_agent:
            raise HTTPException(status_code=500, detail="Retrieval agent not initialized")

        # Get relevant context
        context = await retrieval_agent.get_relevant_context(
            query=request.query,
            platform=request.platform,
            limit=request.limit
        )

        return RetrievalResponse(
            context=context,
            sources=[]
        )

    except Exception as e:
        print(f"Retrieval error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/api/clear")
async def clear_cache_endpoint():
    """Clear backend cache (facts and embeddings)"""
    try:
        if retrieval_agent:
            retrieval_agent.clear_cache()
            return {"success": True, "message": "Backend cache cleared"}
        else:
            return {"success": True, "message": "No cache to clear"}
    except Exception as e:
        print(f"Clear cache error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
