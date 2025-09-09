"""
Word2Vec model training and visualization API endpoints.
"""
import logging
from datetime import datetime, timezone
from typing import Dict, List
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from sqlmodel import Session, select

from app.models.database import get_db_session, Paper
from app.models.word2vec import ModelManager
from app.core.dependencies import get_session_id

logger = logging.getLogger(__name__)
router = APIRouter()

# Global model manager instance
model_manager = ModelManager()

# Global training status tracking
training_status = {}


@router.get("/training-status/{session_id}")
async def get_training_status(session_id: str):
    """
    Get the current training status for a session.
    """
    try:
        logger.info(f"🔍 Getting training status for session: {session_id}")
        logger.info(f"📊 Available sessions: {list(training_status.keys())}")
        
        if session_id not in training_status:
            logger.warning(f"⚠️ Session {session_id} not found in training_status")
            return {
                "session_id": session_id,
                "status": "not_found",
                "message": "No training session found with this ID"
            }
        
        status = training_status[session_id]
        logger.info(f"📊 Status for session {session_id}: {status}")
        
        response = {
            "session_id": session_id,
            "status": status.get("status", "unknown"),
            "message": status.get("message", ""),
            "start_time": status.get("start_time"),
            "end_time": status.get("end_time"),
            "progress": status.get("progress", {}),
            "error": status.get("error"),
            "total_time": status.get("total_time")
        }
        
        logger.info(f"📊 Returning response: {response}")
        return response
    except Exception as e:
        logger.error(f"Error getting training status for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get training status: {str(e)}"
        )


@router.post("/train-models")
async def train_models(
    background_tasks: BackgroundTasks,
    vector_dim: int = 100,
    window: int = 20,
    min_count: int = 2,
    epochs: int = 20,
    alignment_method: str = "compass",
    session: Session = Depends(get_db_session),
    session_id: str = Depends(get_session_id)
):
    """
    Train Word2Vec models for all available indexes and align them.
    This runs in the background to avoid blocking the API.
    """
    import time
    from datetime import datetime
    
    start_time = time.time()
    
    try:
        logger.info(f"🚀 Received training request for session: {session_id}")
        logger.info(f"📊 Request parameters:")
        logger.info(f"   - Vector dimension: {vector_dim}")
        logger.info(f"   - Window size: {window}")
        logger.info(f"   - Min count: {min_count}")
        logger.info(f"   - Epochs: {epochs}")
        logger.info(f"   - Alignment method: {alignment_method}")
        
        # Validate alignment method
        if alignment_method not in ["procrustes", "compass"]:
            logger.error(f"Invalid alignment method: {alignment_method}")
            raise HTTPException(
                status_code=400,
                detail="Alignment method must be 'procrustes' or 'compass'"
            )
        
        # Get all papers grouped by index
        logger.info("🔍 Fetching papers from database...")
        db_start = time.time()
        papers = session.exec(select(Paper)).all()
        db_time = time.time() - db_start
        
        if not papers:
            logger.error("No papers found in database")
            raise HTTPException(
                status_code=400,
                detail="No data found. Please upload data first."
            )
        
        logger.info(f"✅ Retrieved {len(papers)} papers from database in {db_time:.2f}s")
        
        # Group papers by index
        logger.info("🔧 Grouping papers by index...")
        grouping_start = time.time()
        papers_by_index = {}
        for paper in papers:
            if paper.index not in papers_by_index:
                papers_by_index[paper.index] = []
            papers_by_index[paper.index].append(paper.text)
        
        grouping_time = time.time() - grouping_start
        logger.info(f"✅ Grouped papers into {len(papers_by_index)} indexes in {grouping_time:.2f}s")
        logger.info(f"📊 Index breakdown:")
        for index, texts in papers_by_index.items():
            logger.info(f"   - {index}: {len(texts)} texts")
        
        # Initialize status tracking
        training_status[session_id] = {
            "status": "running",
            "message": f"Training and alignment started using {alignment_method} method",
            "start_time": datetime.now(timezone.utc).isoformat(),
            "progress": {
                "current_step": "initializing",
                "total_steps": 4,
                "current_step_number": 0,
                "message": "Initializing training process"
            }
        }
        
        # Start background training and alignment
        logger.info(f"🎯 Starting background training and alignment for {len(papers_by_index)} indexes using {alignment_method} method...")
        background_start = time.time()
        
        background_tasks.add_task(
            _train_and_align_models_background,
            papers_by_index,
            alignment_method,
            vector_dim,
            window,
            min_count,
            epochs,
            session_id
        )
        
        background_time = time.time() - background_start
        total_time = time.time() - start_time
        
        logger.info(f"✅ Background task initiated successfully in {background_time:.2f}s")
        logger.info(f"📊 Request processing completed in {total_time:.2f}s")
        
        return {
            "message": f"Training and alignment started for {len(papers_by_index)} indexes using {alignment_method} method",
            "indexes": list(papers_by_index.keys()),
            "session_id": session_id,
            "settings": {
                "vector_dim": vector_dim,
                "window": window,
                "min_count": min_count,
                "epochs": epochs,
                "alignment_method": alignment_method
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        total_time = time.time() - start_time
        logger.error(f"Failed to start training and alignment after {total_time:.2f}s: {str(e)}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to start training and alignment: {str(e)}"
        )


async def _train_and_align_models_background(
    papers_by_index: Dict[str, List[str]],
    alignment_method: str,
    vector_dim: int,
    window: int,
    min_count: int,
    epochs: int,
    session_id: str
):
    """Unified background task for training and aligning models."""
    import time
    from datetime import datetime
    
    start_time = time.time()
    
    try:
        logger.info(f"🚀 Background training and alignment started for session {session_id}")
        logger.info(f"📊 Background task parameters:")
        logger.info(f"   - Alignment method: {alignment_method}")
        logger.info(f"   - Vector dimension: {vector_dim}")
        logger.info(f"   - Window size: {window}")
        logger.info(f"   - Min count: {min_count}")
        logger.info(f"   - Epochs: {epochs}")
        logger.info(f"   - Number of indexes: {len(papers_by_index)}")
        logger.info(f"   - Indexes: {list(papers_by_index.keys())}")
        
        # Update progress - data preparation
        training_status[session_id]["progress"] = {
            "current_step": "data_preparation",
            "total_steps": 4,
            "current_step_number": 1,
            "message": "Preparing data for training"
        }
        
        # Add a small delay to ensure progress is visible
        import asyncio
        await asyncio.sleep(0.5)
        
        # Log data statistics
        total_texts = sum(len(texts) for texts in papers_by_index.values())
        logger.info(f"📝 Data statistics:")
        logger.info(f"   - Total text documents: {total_texts}")
        for index, texts in papers_by_index.items():
            logger.info(f"   - {index}: {len(texts)} texts")
        
        # Update progress - training
        training_status[session_id]["progress"] = {
            "current_step": "model_training",
            "total_steps": 4,
            "current_step_number": 2,
            "message": f"Training models using {alignment_method} method"
        }
        
        # Add another small delay
        await asyncio.sleep(0.5)
        
        
        # Use the appropriate training method with progress updates
        logger.info(f"🎯 Starting unified training and alignment using {alignment_method} method...")
        training_start = time.time()
        
        def update_progress(step: str, message: str, step_number: int = 3):
            """Update progress for the current session."""
            if session_id in training_status:
                progress_data = {
                    "current_step": step,
                    "total_steps": 4,
                    "current_step_number": step_number,
                    "message": message
                }
                
                training_status[session_id]["progress"] = progress_data
                logger.info(f"📊 Progress updated for session {session_id}: {step} - {message}")
            else:
                logger.warning(f"⚠️ Session {session_id} not found in training_status")
                logger.warning(f"⚠️ Available sessions: {list(training_status.keys())}")
        

        if alignment_method == "compass":
            update_progress("cade_training", "Training models using CADE compass method", 3)
            success = model_manager.train_cade(
                papers_by_index=papers_by_index,
                vector_dim=vector_dim,
                window=window,
                min_count=min_count,
                epochs=epochs,
                progress_callback=lambda msg: update_progress("cade_training", msg, 3)
            )
        else:  # procrustes
            update_progress("procrustes_training", "Training models using Procrustes method", 3)
            success = model_manager.train_procrustes(
                papers_by_index=papers_by_index,
                vector_dim=vector_dim,
                window=window,
                min_count=min_count,
                epochs=epochs,
                progress_callback=lambda msg: update_progress("procrustes_training", msg, 3)
            )
        
        # Add a small delay to ensure progress is visible
        await asyncio.sleep(0.5)
        
        training_time = time.time() - training_start
        total_time = time.time() - start_time
        
        # Update progress - completion
        training_status[session_id]["progress"] = {
            "current_step": "completed",
            "total_steps": 4,
            "current_step_number": 4,
            "message": "Training and alignment completed"
        }
        
        if success:
            training_status[session_id].update({
                "status": "completed",
                "message": f"Training and alignment completed successfully in {total_time:.2f}s",
                "end_time": datetime.now(timezone.utc).isoformat(),
                "total_time": total_time,
                "training_time": training_time
            })
            logger.info(f"🎉 Background training and alignment completed successfully for session {session_id}")
            logger.info(f"📊 Background task completed in {total_time:.2f}s")
            logger.info(f"   - Training time: {training_time:.2f}s")
            logger.info(f"   - Total time: {total_time:.2f}s")
        else:
            training_status[session_id].update({
                "status": "failed",
                "message": f"Training and alignment failed after {total_time:.2f}s",
                "end_time": datetime.now(timezone.utc).isoformat(),
                "error": "Training process failed",
                "total_time": total_time
            })
            logger.error(f"Background training and alignment failed for session {session_id}")
            logger.error(f"📊 Background task failed after {total_time:.2f}s")
        
    except Exception as e:
        total_time = time.time() - start_time
        training_status[session_id].update({
            "status": "failed",
            "message": f"Training and alignment failed after {total_time:.2f}s",
            "end_time": datetime.now(timezone.utc).isoformat(),
            "error": str(e),
            "total_time": total_time
        })
        logger.error(f"Background training and alignment failed for session {session_id} after {total_time:.2f}s")
        logger.error(f"Error details: {str(e)}")
        import traceback
        logger.error(f"Full traceback: {traceback.format_exc()}")









@router.get("/neighbor-analysis/{word}")
async def get_neighbor_analysis(
    word: str,
    topn: int = 20,
    session_id: str = Depends(get_session_id)
):
    """
    Get neighbor analysis data for a specific word across all models.
    """
    try:
        if not model_manager.models:
            raise HTTPException(
                status_code=400,
                detail="No trained models found. Please train models first."
            )
        
        neighbor_data = model_manager.get_neighbor_analysis_data(
            word=word,
            topn=topn
        )
        
        if not neighbor_data:
            raise HTTPException(
                status_code=404,
                detail=f"Word '{word}' not found in any trained models"
            )
        
        return neighbor_data
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get neighbor analysis for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to get neighbor analysis: {str(e)}"
        )






@router.get("/cosine-similarities")
async def get_cosine_similarities(
    session: Session = Depends(get_db_session),
    session_id: str = Depends(get_session_id)
):
    """Calculate cosine similarities between topics and related terms across all aligned indexes."""
    try:
        # Get topics with their related terms
        from app.models.database import get_topics_with_terms
        topics_with_terms = get_topics_with_terms(session)
        
        if not topics_with_terms:
            return {"similarities": [], "message": "No topics found"}
        
        # Convert to the format expected by the model manager
        topics_data = []
        for topic in topics_with_terms:
            topic_dict = {
                "id": topic.id,
                "name": topic.name,
                "related_terms": [
                    {
                        "id": term.id,
                        "term": term.term
                    }
                    for term in topic.related_terms
                ]
            }
            topics_data.append(topic_dict)
        
        # Calculate similarities using aligned models
        similarities = model_manager.calculate_cosine_similarities(topics_data)
        
        return {
            "similarities": similarities,
            "total_calculations": len(similarities),
            "message": "Cosine similarities calculated successfully"
        }
    except Exception as e:
        logger.error(f"Failed to calculate cosine similarities for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to calculate cosine similarities: {str(e)}"
        )


@router.delete("/models")
async def clear_models(session_id: str = Depends(get_session_id)):
    """Clear all models from memory and disk."""
    try:
        success = model_manager.clear_models()
        if success:
            return {"message": "All models cleared successfully", "models_cleared": True}
        else:
            return {"message": "No models to clear", "models_cleared": False}
    except Exception as e:
        logger.error(f"Failed to clear models for session {session_id}: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to clear models: {str(e)}"
        )
