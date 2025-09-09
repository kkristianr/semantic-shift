"""
Request context management for combining database and user session dependencies.
"""
import logging
from dataclasses import dataclass
from sqlmodel import Session
from fastapi import Depends

from app.models.database import get_db_session
from app.core.dependencies import get_user_session_id

logger = logging.getLogger(__name__)


@dataclass
class RequestContext:
    """Context object containing all request-scoped dependencies."""
    db: Session
    user_session_id: str
    
    def log_action(self, action: str, **kwargs):
        """Helper method for consistent logging with session context."""
        logger.info(f"[Session: {self.user_session_id}] {action}", extra=kwargs)
    
    def log_error(self, action: str, error: Exception, **kwargs):
        """Helper method for consistent error logging with session context."""
        logger.error(f"[Session: {self.user_session_id}] {action} failed: {str(error)}", extra=kwargs)


async def get_request_context(
    db: Session = Depends(get_db_session),
    user_session_id: str = Depends(get_user_session_id)
) -> RequestContext:
    """
    Combined dependency that provides both database session and user session ID.
    This replaces the need for separate get_db_session and get_user_session_id dependencies.
    """
    return RequestContext(db=db, user_session_id=user_session_id)
