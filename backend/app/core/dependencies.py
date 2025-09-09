"""
Dependencies for API endpoints.
"""
from fastapi import HTTPException, Header
from typing import Optional

from app.core.session import session_manager

async def get_user_session_id(session_id: Optional[str] = Header(None, alias="X-Session-ID")) -> str:
    """
    Validate session ID from header or create one if none exists.
    """
    if not session_id:
        # Check if system is available before trying to create a session
        if not session_manager.is_system_available():
            raise HTTPException(
                status_code=409,
                detail="System is currently occupied by another user. Please wait for their session to expire before accessing the system."
            )
        
        # Automatically create a new session if none provided and system is available
        try:
            session_id = session_manager.create_session()
        except ValueError as e:
            # This should not happen since we checked is_system_available(), but handle it anyway
            raise HTTPException(
                status_code=409,
                detail="System is currently occupied by another user. Please wait for their session to expire before accessing the system."
            )
    
    if not session_manager.is_session_valid(session_id):
        raise HTTPException(
            status_code=401,
            detail="Session expired or invalid. Please refresh the page to get a new session."
        )
    
    return session_id


# Keep the old name for backward compatibility during transition
async def get_session_id(session_id: Optional[str] = Header(None, alias="X-Session-ID")) -> str:
    """
    Validate session ID from header or create one if none exists.
    DEPRECATED: Use get_user_session_id instead.
    """
    return await get_user_session_id(session_id)
