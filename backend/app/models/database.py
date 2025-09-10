"""
Database models for the diachronic data visualization tool.
"""
from datetime import datetime, timezone
from typing import Optional, List
from sqlmodel import SQLModel, Field, create_engine, Session, select
import os


def utc_now():
    """Timezone-aware UTC datetime factory for SQLModel Field defaults."""
    return datetime.now(timezone.utc)


class PaperBase(SQLModel):
    """Base model for paper data."""
    index: str = Field(description="Unique identifier (year, decade, publisher ID, etc.)")
    text: str = Field(description="Concatenated text content for this index")
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: Optional[datetime] = Field(default=None)


class Paper(PaperBase, table=True):
    """Paper model for database table."""
    id: Optional[int] = Field(default=None, primary_key=True)


class PaperCreate(PaperBase):
    """Model for creating new papers."""
    pass


class PaperRead(PaperBase):
    """Model for reading paper data."""
    id: int


class PaperUpdate(SQLModel):
    """Model for updating papers."""
    index: Optional[str] = None
    text: Optional[str] = None
    updated_at: datetime = Field(default_factory=utc_now)


class UploadStats(SQLModel):
    """Statistics about uploaded data."""
    total_indexes: int
    total_tokens: int
    total_characters: int
    unique_indexes: int
    unique_index_list: List[str] = Field(description="List of unique indexes")


class Topic(SQLModel, table=True):
    """Model for storing topics of interest."""
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(unique=True, index=True)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class TopicCreate(SQLModel):
    """Model for creating new topics."""
    name: str


class TopicRead(SQLModel):
    """Model for reading topic data."""
    id: int
    name: str
    created_at: datetime
    updated_at: datetime


class TopicUpdate(SQLModel):
    """Model for updating topics."""
    name: Optional[str] = None
    updated_at: datetime = Field(default_factory=utc_now)


class RelatedTerm(SQLModel, table=True):
    """Model for storing related terms for topics."""
    id: Optional[int] = Field(default=None, primary_key=True)
    topic_id: int = Field(foreign_key="topic.id")
    term: str = Field(index=True)
    created_at: datetime = Field(default_factory=utc_now)


class RelatedTermCreate(SQLModel):
    """Model for creating new related terms."""
    topic_id: int
    term: str


class RelatedTermRead(SQLModel):
    """Model for reading related term data."""
    id: int
    topic_id: int
    term: str
    created_at: datetime


class TopicWithTerms(SQLModel):
    """Model for reading topics with their related terms."""
    id: int
    name: str
    created_at: datetime
    updated_at: datetime
    related_terms: List[RelatedTermRead] = []


# Database configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")

# Create engine
engine = create_engine(
    DATABASE_URL,
    echo=True,  # Set to False in production
    connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
)


def create_db_and_tables():
    """Create database and tables."""
    SQLModel.metadata.create_all(engine)


def get_db_session():
    """Get database session."""
    with Session(engine) as session:
        yield session


def get_papers(session: Session, skip: int = 0, limit: int = 100):
    """Get papers with pagination."""
    statement = select(Paper).offset(skip).limit(limit)
    papers = session.exec(statement).all()
    return papers


def get_paper_by_index(session: Session, index: str):
    """Get paper by index."""
    statement = select(Paper).where(Paper.index == index)
    paper = session.exec(statement).first()
    return paper


def create_paper(session: Session, paper: PaperCreate):
    """Create a new paper."""
    db_paper = Paper.from_orm(paper)
    session.add(db_paper)
    session.commit()
    session.refresh(db_paper)
    return db_paper


def delete_paper(session: Session, paper_id: int):
    """Delete a paper by ID."""
    paper = session.get(Paper, paper_id)
    if paper:
        session.delete(paper)
        session.commit()
        return True
    return False


def get_upload_statistics(session: Session) -> UploadStats:
    """Get statistics about uploaded data."""
    papers = session.exec(select(Paper)).all()
    
    total_indexes = len(papers)
    total_characters = sum(len(paper.text) for paper in papers)
    
    # Count tokens (simple word count)
    total_tokens = sum(len(paper.text.split()) for paper in papers)
    
    # Count unique indexes and get the list
    unique_index_set = set(paper.index for paper in papers)
    unique_indexes = len(unique_index_set)
    unique_index_list = sorted(list(unique_index_set))
    
    return UploadStats(
        total_indexes=total_indexes,
        total_tokens=total_tokens,
        total_characters=total_characters,
        unique_indexes=unique_indexes,
        unique_index_list=unique_index_list
    )


# Topic and Related Term functions
def format_term(term: str) -> Optional[str]:
    """Format and validate a term (1-3 words max)."""
    if not term:
        return None
    
    words = term.strip().split()
    if len(words) > 3:
        raise ValueError("Please enter a term with 1 to 3 words only.")
    elif len(words) > 1:
        n_words = len(words)
        term = "_".join(words)
        if n_words == 2:
            # Warning: bigram - should frequently appear together
            pass
        elif n_words == 3:
            # Warning: trigram - should frequently appear together
            pass
    return term


def create_topic(session: Session, topic: TopicCreate) -> Topic:
    """Create a new topic."""
    # Format the term
    formatted_name = format_term(topic.name)
    if not formatted_name:
        raise ValueError("Invalid topic name")
    
    # Check if topic already exists
    existing_topic = session.exec(select(Topic).where(Topic.name == formatted_name)).first()
    if existing_topic:
        raise ValueError(f"Topic '{formatted_name}' already exists")
    
    db_topic = Topic(name=formatted_name)
    session.add(db_topic)
    session.commit()
    session.refresh(db_topic)
    return db_topic


def get_all_topics(session: Session) -> List[Topic]:
    """Get all topics."""
    return session.exec(select(Topic).order_by(Topic.name)).all()


def get_topic_by_id(session: Session, topic_id: int) -> Optional[Topic]:
    """Get a topic by ID."""
    return session.get(Topic, topic_id)


def get_topic_by_name(session: Session, name: str) -> Optional[Topic]:
    """Get a topic by name."""
    return session.exec(select(Topic).where(Topic.name == name)).first()


def update_topic(session: Session, topic_id: int, topic_update: TopicUpdate) -> Optional[Topic]:
    """Update a topic."""
    db_topic = session.get(Topic, topic_id)
    if not db_topic:
        return None
    
    if topic_update.name is not None:
        formatted_name = format_term(topic_update.name)
        if not formatted_name:
            raise ValueError("Invalid topic name")
        
        # Check if new name conflicts with existing topic
        existing_topic = session.exec(select(Topic).where(Topic.name == formatted_name)).first()
        if existing_topic and existing_topic.id != topic_id:
            raise ValueError(f"Topic '{formatted_name}' already exists")
        
        db_topic.name = formatted_name
    
    db_topic.updated_at = datetime.now(timezone.utc)
    session.add(db_topic)
    session.commit()
    session.refresh(db_topic)
    return db_topic


def delete_topic(session: Session, topic_id: int) -> bool:
    """Delete a topic and all its related terms."""
    db_topic = session.get(Topic, topic_id)
    if not db_topic:
        return False
    
    # Delete all related terms first
    related_terms = session.exec(select(RelatedTerm).where(RelatedTerm.topic_id == topic_id)).all()
    for term in related_terms:
        session.delete(term)
    
    session.delete(db_topic)
    session.commit()
    return True


def create_related_term(session: Session, related_term: RelatedTermCreate) -> RelatedTerm:
    """Create a new related term."""
    # Format the term
    formatted_term = format_term(related_term.term)
    if not formatted_term:
        raise ValueError("Invalid related term")
    
    # Check if topic exists
    topic = session.get(Topic, related_term.topic_id)
    if not topic:
        raise ValueError("Topic not found")
    
    # Check if term already exists for this topic
    existing_term = session.exec(
        select(RelatedTerm).where(
            RelatedTerm.topic_id == related_term.topic_id,
            RelatedTerm.term == formatted_term
        )
    ).first()
    
    if existing_term:
        raise ValueError(f"Related term '{formatted_term}' already exists for this topic")
    
    db_related_term = RelatedTerm(
        topic_id=related_term.topic_id,
        term=formatted_term
    )
    session.add(db_related_term)
    session.commit()
    session.refresh(db_related_term)
    return db_related_term


def get_related_terms_by_topic(session: Session, topic_id: int) -> List[RelatedTerm]:
    """Get all related terms for a specific topic."""
    return session.exec(
        select(RelatedTerm).where(RelatedTerm.topic_id == topic_id).order_by(RelatedTerm.term)
    ).all()


def delete_related_term(session: Session, term_id: int) -> bool:
    """Delete a related term."""
    db_term = session.get(RelatedTerm, term_id)
    if not db_term:
        return False
    
    session.delete(db_term)
    session.commit()
    return True


def get_topics_with_terms(session: Session) -> List[TopicWithTerms]:
    """Get all topics with their related terms."""
    topics = get_all_topics(session)
    result = []
    
    for topic in topics:
        related_terms = get_related_terms_by_topic(session, topic.id)
        topic_with_terms = TopicWithTerms(
            id=topic.id,
            name=topic.name,
            created_at=topic.created_at,
            updated_at=topic.updated_at,
            related_terms=related_terms
        )
        result.append(topic_with_terms)
    
    return result


def clear_all_data(session: Session) -> dict:
    """
    Clear all data from the database - papers, topics, and related terms.
    This provides a clean slate for new sessions.
    """
    import logging
    logger = logging.getLogger(__name__)
    
    try:
        logger.info("🧹 Starting global data cleanup...")
        
        # Count existing data before deletion
        papers_count = len(session.exec(select(Paper)).all())
        topics_count = len(session.exec(select(Topic)).all())
        terms_count = len(session.exec(select(RelatedTerm)).all())
        
        logger.info(f"📊 Data to be cleared: {papers_count} papers, {topics_count} topics, {terms_count} terms")
        
        # Delete all related terms first (due to foreign key constraints)
        session.exec(select(RelatedTerm)).all()
        session.query(RelatedTerm).delete()
        
        # Delete all topics
        session.query(Topic).delete()
        
        # Delete all papers
        session.query(Paper).delete()
        
        # Commit all deletions
        session.commit()
        
        logger.info("✅ Global data cleanup completed successfully")
        
        return {
            "message": "All data cleared successfully",
            "papers_deleted": papers_count,
            "topics_deleted": topics_count,
            "terms_deleted": terms_count,
            "status": "success"
        }
        
    except Exception as e:
        logger.error(f"Failed to clear all data: {str(e)}")
        session.rollback()
        raise e

