"""
Simple session management: one active session at a time.
When a session expires, another user can create a new session.
"""
import uuid
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional
from sqlmodel import select

from app.models.database import get_db_session, Paper, Topic, RelatedTerm

logger = logging.getLogger(__name__)

class SessionManager:
    """Simple session manager: one active session at a time."""
    
    def __init__(self, session_duration: int = 1800):
        self.session_duration = session_duration
        self.sessions: Dict[str, Dict] = {}
    
    def create_session(self) -> str:
        """Create a new demo session only if no active session exists."""
        # Check if there's already an active session
        if len(self.sessions) > 0:
            logger.warning("User attempted to create session but another session is active")
            raise ValueError("Another session is currently active. Please wait for it to expire.")
        
        session_id = str(uuid.uuid4())
        now = datetime.now()
        
        self.sessions[session_id] = {
            'created_at': now,
            'expires_at': now + timedelta(seconds=self.session_duration)
        }
        
        logger.info(f"Created demo session: {session_id}, expires at: {self.sessions[session_id]['expires_at']}")
        return session_id
    
    def is_session_valid(self, session_id: str) -> bool:
        """Check if session exists and is not expired."""
        if session_id not in self.sessions:
            return False
        
        session = self.sessions[session_id]
        now = datetime.now()
        
        if now > session['expires_at']:
            logger.info(f"Session {session_id} expired at {session['expires_at']}")
            # Clean up expired session data and remove from active sessions
            self._cleanup_session_data(session_id)
            del self.sessions[session_id]
            return False
        
        return True
    
    def get_session_info(self, session_id: str) -> Optional[Dict]:
        """Get session info if valid."""
        if not self.is_session_valid(session_id):
            return None
        
        session = self.sessions[session_id]
        now = datetime.now()
        time_remaining = (session['expires_at'] - now).total_seconds()
        
        return {
            'session_id': session_id,
            'created_at': session['created_at'].isoformat(),
            'expires_at': session['expires_at'].isoformat(),
            'time_remaining': max(0, int(time_remaining)),
            'is_valid': True
        }
    
    def is_system_available(self) -> bool:
        """Check if the system is available for a new session."""
        return len(self.sessions) == 0
    
    def get_active_session_count(self) -> int:
        """Get the number of active sessions."""
        return len(self.sessions)
    
    def terminate_session(self, session_id: str) -> bool:
        """Terminate a session early and clean up its data."""
        if session_id not in self.sessions:
            return False
        
        logger.info(f"Terminating session early: {session_id}")
        self._cleanup_session_data(session_id)
        del self.sessions[session_id]
        return True
    
    def cleanup_expired_sessions(self):
        """Remove expired sessions and clean up their data."""
        now = datetime.now()
        expired_sessions = []
        
        for session_id, session in self.sessions.items():
            if now > session['expires_at']:
                expired_sessions.append(session_id)
        
        for session_id in expired_sessions:
            logger.info(f"Cleaning up expired session: {session_id}")
            self._cleanup_session_data(session_id)
            del self.sessions[session_id]
    
    def _cleanup_session_data(self, session_id: str):
        """Clean up all data associated with an expired session."""
        try:
            db_session = next(get_db_session())
            try:
                # Delete all papers, topics, and related terms
                papers = db_session.exec(select(Paper)).all()
                for paper in papers:
                    db_session.delete(paper)
                topics = db_session.exec(select(Topic)).all()
                for topic in topics:
                    related_terms = db_session.exec(
                        select(RelatedTerm).where(RelatedTerm.topic_id == topic.id)
                    ).all()
                    for term in related_terms:
                        db_session.delete(term)
                    db_session.delete(topic)
                db_session.commit()
                logger.info(f"Cleaned up data for expired session {session_id}")
            except Exception as e:
                logger.error(f"Error cleaning up data for session {session_id}: {e}")
                db_session.rollback()
            finally:
                db_session.close()
        except Exception as e:
            logger.error(f"Failed to cleanup session data for {session_id}: {e}")

# Global session manager instance
session_manager = SessionManager()
