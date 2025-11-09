from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class Message(BaseModel):
    platform: str
    text: str
    isUser: bool
    timestamp: str
    url: str


class Fact(BaseModel):
    text: str
    category: str
    confidence: float
    entities: Optional[List[str]] = []
    platform: Optional[str] = None
    timestamp: Optional[str] = None


class ExtractionRequest(BaseModel):
    message: Message


class ExtractionResponse(BaseModel):
    success: bool
    facts: List[Fact]
    processingTime: float


class RetrievalRequest(BaseModel):
    query: str
    platform: str
    limit: int = 5


class RetrievalResponse(BaseModel):
    context: List[str]
    sources: Optional[List[dict]] = []


class HealthResponse(BaseModel):
    status: str
    version: str
    backends: dict
