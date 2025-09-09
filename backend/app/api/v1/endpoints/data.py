"""
Data upload API endpoints
"""
import pandas as pd
import io
import logging
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlmodel import select

from app.models.database import (
    create_paper, get_upload_statistics, PaperCreate, UploadStats, Paper
)
from app.core.context import get_request_context, RequestContext

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

router = APIRouter()


@router.post("/upload-csv", response_model=dict)
async def upload_csv_file(
    file: UploadFile = File(...),
    ctx: RequestContext = Depends(get_request_context)
):
    """
    Upload a CSV file with papers data.
    
    Expected format:
    - index: Unique identifier (year, decade, publisher ID, etc.)
    - text: Concatenated text content for this index
    """
    try:
        ctx.log_action(f"Starting CSV upload for file: {file.filename}")
        
        if not file.filename.endswith('.csv'):
            logger.error(f"Invalid file type: {file.filename}")
            raise HTTPException(
                status_code=400,
                detail="File must be a CSV file"
            )
        
        content = await file.read()
        logger.info(f"File content length: {len(content)} bytes")
        
        try:
            df = pd.read_csv(io.StringIO(content.decode('utf-8')))
            logger.info(f"CSV parsed successfully. Shape: {df.shape}")
            logger.info(f"Columns found: {list(df.columns)}")
        except Exception as e:
            logger.error(f"CSV parsing failed: {str(e)}")
            raise HTTPException(
                status_code=400,
                detail=f"Failed to parse CSV: {str(e)}"
            )
        
        # Validate required columns
        required_columns = ['index', 'text']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            logger.error(f"Missing columns: {missing_columns}")
            raise HTTPException(
                status_code=400,
                detail=f"Missing required columns: {missing_columns}. "
                       f"Expected columns: {required_columns}"
            )
        
        # Validate data types - be more flexible with pandas data types
        logger.info(f"Column data types - index: {df['index'].dtype}, text: {df['text'].dtype}")
        
        # Check if columns can be converted to string (more flexible than requiring object type)
        try:
            # Convert to string to ensure compatibility
            df['index'] = df['index'].astype(str)
            df['text'] = df['text'].astype(str)
            logger.info("Data types converted to string successfully")
        except Exception as e:
            logger.error(f"Failed to convert data types to string: {str(e)}")
            raise HTTPException(
                status_code=400,
                detail="Failed to process column data types. Please ensure all data can be converted to text."
            )
        
        # Check for empty values
        if df['index'].isnull().any() or df['text'].isnull().any():
            logger.error("Empty values found in index or text columns")
            raise HTTPException(
                status_code=400,
                detail="Neither 'index' nor 'text' columns can contain empty values"
            )
        
        # Check for duplicate indexes
        duplicate_indexes = df[df['index'].duplicated()]['index'].tolist()
        if duplicate_indexes:
            logger.error(f"Duplicate indexes found: {duplicate_indexes}")
            raise HTTPException(
                status_code=400,
                detail=f"Duplicate indexes found: {duplicate_indexes}. "
                       f"Each index must be unique."
            )
        
        logger.info("All validations passed. Starting to save papers...")
        
        # Process and save papers
        papers_created = 0
        papers_skipped = 0
        
        for _, row in df.iterrows():
            try:
                # Check if paper with this index already exists
                existing_paper = ctx.db.exec(
                    select(Paper).where(Paper.index == row['index'])
                ).first()
                
                if existing_paper:
                    papers_skipped += 1
                    continue
                
                # Create new paper
                paper_data = PaperCreate(
                    index=str(row['index']),
                    text=str(row['text'])
                )
                create_paper(ctx.db, paper_data)
                papers_created += 1
                
            except Exception as e:
                logger.error(f"Failed to save paper with index '{row['index']}': {str(e)}")
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to save paper with index '{row['index']}': {str(e)}"
                )
        
        ctx.log_action(f"Upload completed. Created: {papers_created}, Skipped: {papers_skipped}")
        
        return {
            "message": "Your data has been uploaded successfully",
            "papers_created": papers_created,
            "papers_skipped": papers_skipped,
            "total_rows": len(df),
            "session_id": ctx.user_session_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error during upload: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail=f"Unexpected error during upload: {str(e)}"
        )



@router.get("/statistics", response_model=UploadStats)
async def get_statistics(
    ctx: RequestContext = Depends(get_request_context)
    ):
    """Get statistics about uploaded data."""
    try:
        stats = get_upload_statistics(ctx.db)
        return stats
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve statistics: {str(e)}"
        )


@router.delete("/papers")
async def clear_all_papers(
    ctx: RequestContext = Depends(get_request_context)
    ):
    """Clear all papers from the database."""
    try:
        papers = ctx.db.exec(select(Paper)).all()
        for paper in papers:
            ctx.db.delete(paper)
        ctx.db.commit()
        ctx.log_action(f"Cleared {len(papers)} papers from database")
        return {"message": f"Cleared {len(papers)} papers from database"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to clear papers: {str(e)}"
        )
