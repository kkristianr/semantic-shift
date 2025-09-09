"""
Main API router that includes all endpoint routers.
"""
from fastapi import APIRouter

from app.api.v1.endpoints import data, word2vec, terms, sessions

api_router = APIRouter()

# Include all endpoint routers
api_router.include_router(data.router, prefix="/data", tags=["data"])
api_router.include_router(word2vec.router, prefix="/word2vec", tags=["word2vec"])
api_router.include_router(terms.router, prefix="/terms", tags=["terms"])
api_router.include_router(sessions.router, prefix="/sessions", tags=["sessions"]) 