"""
Simple session management API endpoints.
"""
import logging
from fastapi import APIRouter, Depends, HTTPException
from typing import Dict, Any
from sqlmodel import Session

from app.core.session import session_manager
from app.core.dependencies import get_session_id
from app.models.database import get_db_session, clear_all_data

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/create")
async def create_session(db: Session = Depends(get_db_session)) -> Dict[str, Any]:
    """Create a new demo session. Only allowed when no other session is active."""
    try:
        logger.info("🚀 Creating new session with data cleanup...")
        
        # Clear all data first to provide a clean slate
        clear_result = clear_all_data(db)
        logger.info(f"📊 Data cleared: {clear_result['papers_deleted']} papers, {clear_result['topics_deleted']} topics, {clear_result['terms_deleted']} terms")
        
        # Create the new session
        session_id = session_manager.create_session()
        
        return {
            "session_id": session_id,
            "message": "Demo session created with clean database. Valid for 30 minutes. You are the only active user.",
            "expires_in": "30 minutes",
            "data_cleared": True,
            "papers_deleted": clear_result['papers_deleted'],
            "topics_deleted": clear_result['topics_deleted'],
            "terms_deleted": clear_result['terms_deleted'],
            "note": "Other users must wait for this session to expire"
        }
    except ValueError as e:
        logger.warning(f"Session creation blocked: {str(e)}")
        raise HTTPException(
            status_code=409,
            detail="Another session is currently active. Please wait for it to expire before creating a new session."
        )
    except Exception as e:
        logger.error(f"Failed to create session: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create session: {str(e)}"
        )


@router.post("/clear-all-data")
async def clear_all_data_endpoint(db: Session = Depends(get_db_session)) -> Dict[str, Any]:
    """Clear all data from the database - data, topics, and related terms."""
    try:
        logger.info("Clearing all data...")
        clear_result = clear_all_data(db)
        
        return {
            "message": "All data cleared successfully",
            "papers_deleted": clear_result['papers_deleted'],
            "topics_deleted": clear_result['topics_deleted'],
            "terms_deleted": clear_result['terms_deleted'],
            "status": "success"
        }
    except Exception as e:
        logger.error(f"Failed to clear all data: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to clear all data: {str(e)}"
        )


@router.get("/info")
async def get_session_info(session_id: str = Depends(get_session_id)) -> Dict:
    """Get information about the current session."""
    try:
        session_info = session_manager.get_session_info(session_id)
        if session_info:
            return {
                "session_id": session_id,
                "created_at": session_info["created_at"],
                "expires_at": session_info["expires_at"],
                "time_remaining_seconds": session_info["time_remaining"],
                "is_active": session_info["is_valid"]
            }
        else:
            raise HTTPException(
                status_code=404,
                detail="Session not found or expired"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get session info for {session_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get session info: {str(e)}"
        )


@router.get("/status")
async def get_demo_status() -> Dict:
    """Get demo system status and current session information."""
    try:
        system_available = session_manager.is_system_available()
        active_count = session_manager.get_active_session_count()
        
        return {
            "system_status": "available" if system_available else "occupied",
            "active_sessions": active_count,
            "can_create_session": system_available,
            "message": "Single-user demo system. Only one session can be active at a time.",
            "note": "When current session expires, another user can create a new session"
        }
    except Exception as e:
        logger.error(f"Failed to get demo status: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get demo status: {str(e)}"
        )


@router.delete("/terminate")
async def terminate_session(session_id: str = Depends(get_session_id), db: Session = Depends(get_db_session)) -> Dict[str, Any]:
    """Terminate the current session early and clear all data."""
    try:
        logger.info(f"🛑 Terminating session {session_id} with data cleanup...")
        
        # Clear all data first
        clear_result = clear_all_data(db)
        logger.info(f"📊 Data cleared: {clear_result['papers_deleted']} papers, {clear_result['topics_deleted']} topics, {clear_result['terms_deleted']} terms")
        
        success = session_manager.terminate_session(session_id)
        if success:
            return {
                "message": "Session terminated successfully and all data cleared. System is now available for other users.",
                "status": "terminated",
                "data_cleared": True,
                "papers_deleted": clear_result['papers_deleted'],
                "topics_deleted": clear_result['topics_deleted'],
                "terms_deleted": clear_result['terms_deleted']
            }
        else:
            raise HTTPException(
                status_code=404,
                detail="Session not found or already terminated"
            )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to terminate session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to terminate session: {str(e)}"
        )
