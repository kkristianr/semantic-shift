"""
Terms of Interest API endpoints for managing topics and related terms.
"""
import logging
from typing import List
from fastapi import APIRouter, Depends, HTTPException

from app.models.database import (
    create_topic, get_all_topics, get_topic_by_id,
    update_topic, delete_topic, create_related_term, get_related_terms_by_topic,
    delete_related_term, get_topics_with_terms,
    TopicCreate, TopicRead, TopicUpdate, RelatedTermCreate, RelatedTermRead, TopicWithTerms
)
from app.core.context import get_request_context, RequestContext

logger = logging.getLogger(__name__)
router = APIRouter()


@router.get("/topics", response_model=List[TopicRead])
async def get_topics_endpoint(
    ctx: RequestContext = Depends(get_request_context)
):
    """Get all topics."""
    try:
        topics = get_all_topics(ctx.db)
        return topics
    except Exception as e:
        ctx.log_error("Failed to retrieve topics", e)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve topics: {str(e)}"
        )


@router.get("/topics/with-terms", response_model=List[TopicWithTerms])
async def get_topics_with_terms_endpoint(
    ctx: RequestContext = Depends(get_request_context)
):
    """Get all topics with their related terms."""
    try:
        topics_with_terms = get_topics_with_terms(ctx.db)
        return topics_with_terms
    except Exception as e:
        ctx.log_error("Failed to retrieve topics with terms", e)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve topics with terms: {str(e)}"
        )


@router.get("/topics/{topic_id}", response_model=TopicRead)
async def get_topic_endpoint(
    topic_id: int, 
    ctx: RequestContext = Depends(get_request_context)
):
    """Get a specific topic by ID."""
    try:
        topic = get_topic_by_id(ctx.db, topic_id)
        if not topic:
            raise HTTPException(
                status_code=404,
                detail=f"Topic with ID {topic_id} not found"
            )
        return topic
    except HTTPException:
        raise
    except Exception as e:
        ctx.log_error("Failed to retrieve topic", e)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve topic: {str(e)}"
        )


@router.post("/topics", response_model=TopicRead)
async def create_new_topic(
    topic: TopicCreate, 
    ctx: RequestContext = Depends(get_request_context)
):
    """Create a new topic."""
    try:
        new_topic = create_topic(ctx.db, topic)
        ctx.log_action(f"Topic '{new_topic.name}' created successfully")
        return new_topic
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except Exception as e:
        ctx.log_error("Failed to create topic", e)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create topic: {str(e)}"
        )


@router.put("/topics/{topic_id}", response_model=TopicRead)
async def update_existing_topic(
    topic_id: int, 
    topic_update: TopicUpdate, 
    ctx: RequestContext = Depends(get_request_context)
):
    """Update an existing topic."""
    try:
        updated_topic = update_topic(ctx.db, topic_id, topic_update)
        if not updated_topic:
            raise HTTPException(
                status_code=404,
                detail=f"Topic with ID {topic_id} not found"
            )
        ctx.log_action(f"Topic '{updated_topic.name}' updated successfully")
        return updated_topic
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        ctx.log_error("Failed to update topic", e)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to update topic: {str(e)}"
        )


@router.delete("/topics/{topic_id}")
async def delete_existing_topic(
    topic_id: int, 
    ctx: RequestContext = Depends(get_request_context)
):
    """Delete an existing topic and all its related terms."""
    try:
        success = delete_topic(ctx.db, topic_id)
        if not success:
            raise HTTPException(
                status_code=404,
                detail=f"Topic with ID {topic_id} not found"
            )
        ctx.log_action(f"Topic with ID {topic_id} deleted successfully")
        return {"message": f"Topic with ID {topic_id} deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        ctx.log_error("Failed to delete topic", e)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to delete topic: {str(e)}"
        )


@router.post("/topics/{topic_id}/terms", response_model=RelatedTermRead)
async def add_related_term(
    topic_id: int, 
    related_term: RelatedTermCreate, 
    ctx: RequestContext = Depends(get_request_context)
):
    """Add a related term to a topic."""
    try:
        # Ensure the topic_id in the request matches the URL parameter
        if related_term.topic_id != topic_id:
            raise HTTPException(
                status_code=400,
                detail="Topic ID in request body must match URL parameter"
            )
        
        new_term = create_related_term(ctx.db, related_term)
        ctx.log_action(f"Related term '{new_term.term}' added to topic {topic_id}")
        return new_term
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        ctx.log_error("Failed to add related term", e)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to add related term: {str(e)}"
        )


@router.get("/topics/{topic_id}/terms", response_model=List[RelatedTermRead])
async def get_related_terms(
    topic_id: int, 
    ctx: RequestContext = Depends(get_request_context)
):
    """Get all related terms for a specific topic."""
    try:
        # Check if topic exists
        topic = get_topic_by_id(ctx.db, topic_id)
        if not topic:
            raise HTTPException(
                status_code=404,
                detail=f"Topic with ID {topic_id} not found"
            )
        
        related_terms = get_related_terms_by_topic(ctx.db, topic_id)
        return related_terms
    except HTTPException:
        raise
    except Exception as e:
        ctx.log_error("Failed to retrieve related terms", e)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve related terms: {str(e)}"
        )


@router.delete("/topics/{topic_id}/terms/{term_id}")
async def remove_related_term(
    topic_id: int, 
    term_id: int, 
    ctx: RequestContext = Depends(get_request_context)
):
    """Remove a related term from a topic."""
    try:
        # Check if topic exists
        topic = get_topic_by_id(ctx.db, topic_id)
        if not topic:
            raise HTTPException(
                status_code=404,
                detail=f"Topic with ID {topic_id} not found"
            )
        
        success = delete_related_term(ctx.db, term_id)
        if not success:
            raise HTTPException(
                status_code=404,
                detail=f"Related term with ID {term_id} not found"
            )
        
        ctx.log_action(f"Related term with ID {term_id} removed from topic {topic_id}")
        return {"message": f"Related term with ID {term_id} removed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        ctx.log_error("Failed to remove related term", e)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to remove related term: {str(e)}"
        )
