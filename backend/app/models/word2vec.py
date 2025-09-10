"""
Word2Vec models and training functionality for diachronic analysis.
"""
import os
import pickle
import logging
import multiprocessing
from typing import Dict, List, Optional, Tuple, Literal
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
from gensim.models import Word2Vec

# Import CADE for compass alignment
try:
    from cade.cade import CADE
    CADE_AVAILABLE = True
except ImportError as e:
    CADE_AVAILABLE = False
    logging.warning(f"CADE library not available. Compass alignment will not work. Error: {e}")
    logging.warning("To use CADE, install: pip install git+https://github.com/vinid/gensim.git && pip install -U cade")

logger = logging.getLogger(__name__)

# Type for alignment methods
AlignmentMethod = Literal["procrustes", "compass"]

class Word2VecModel:
    """Wrapper for Word2Vec model with additional metadata."""
    
    def __init__(self, index: str, model: Word2Vec, created_at: datetime):
        self.index = index
        self.model = model
        self.created_at = created_at
        self.vector_dim = model.vector_size
        self.vocab_size = len(model.wv.vocab)
    
    def get_word_vector(self, word: str) -> Optional[np.ndarray]:
        """Get vector for a specific word."""
        try:
            return self.model.wv[word]
        except KeyError:
            return None
    
    def get_similarity(self, word1: str, word2: str) -> Optional[float]:
        """Get cosine similarity between two words."""
        try:
            return self.model.wv.similarity(word1, word2)
        except KeyError:
            return None
    
    def get_most_similar(self, word: str, topn: int = 10) -> List[Tuple[str, float]]:
        """Get most similar words to a given word."""
        try:
            return self.model.wv.most_similar(word, topn=topn)
        except KeyError:
            return []

class ModelManager:
    """Manages Word2Vec model training, alignment, and storage."""
    
    def __init__(self, models_dir: str = "models"):
        self.models_dir = Path(models_dir)
        self.models_dir.mkdir(exist_ok=True)
        self.models: Dict[str, Word2VecModel] = {}
        self.alignment_matrix: Optional[np.ndarray] = None
        self.reference_index: Optional[str] = None
    
    def train_model(
        self, 
        index: str, 
        texts: List[str], 
        vector_dim: int = 100,
        window: int = 20,
        min_count: int = 2,
        epochs: int = 20,
        progress_callback=None,
        **kwargs
    ) -> Word2VecModel:
        """Train a Word2Vec model for a specific index."""
        import time
        start_time = time.time()
        
        logger.info(f"🚀 Starting Word2Vec training for index: {index}")
        logger.info(f"📊 Training parameters: vector_dim={vector_dim}, window={window}, min_count={min_count}, epochs={epochs}")
        logger.info(f"📝 Input data: {len(texts)} text documents")
        
        # Preprocess texts (simple tokenization for now)
        logger.info(f"🔧 Preprocessing {len(texts)} texts for index {index}")
        preprocessing_start = time.time()
        processed_texts = self._preprocess_texts(texts)
        preprocessing_time = time.time() - preprocessing_start
        
        total_sentences = sum(len(sentence) for sentence in processed_texts)
        total_tokens = sum(len(token) for sentence in processed_texts for token in sentence)
        
        logger.info(f"✅ Preprocessing completed in {preprocessing_time:.2f}s")
        logger.info(f"📈 Processed data: {len(processed_texts)} sentences, {total_tokens} total tokens")
        
        # Train the model with progress updates
        logger.info(f"🎯 Starting Word2Vec model training for index {index}")
        training_start = time.time()
        
        if progress_callback:
            logger.info(f"📊 Training with real-time progress updates for {epochs} epochs")
            
            # Initialize model with 1 epoch
            model = Word2Vec(
                sentences=processed_texts,
                size=vector_dim,
                window=window,
                min_count=min_count,
                iter=1,  # Start with 1 epoch
                sg=1,  # Skip-gram
                workers=multiprocessing.cpu_count(),
                **kwargs
            )
            
            # Train epoch by epoch with real-time progress updates
            import time
            for epoch in range(1, epochs + 1):
                if epoch > 1:
                    # Continue training for additional epochs
                    model.train(processed_texts, total_examples=len(processed_texts), epochs=1)
                
                # Update progress in real-time
                progress_percent = (epoch / epochs) * 100
                try:
                    progress_callback(f"Training epoch {epoch}/{epochs} ({progress_percent:.1f}%)")
                except Exception as e:
                    logger.warning(f"⚠️ Progress callback failed: {e}")
                logger.info(f"📊 Epoch {epoch}/{epochs} completed ({progress_percent:.1f}%)")
                
                # Small delay to ensure progress is visible and frontend can catch updates
                time.sleep(0.2)
        else:
            # Standard training without progress updates
            model = Word2Vec(
                sentences=processed_texts,
                size=vector_dim,
                window=window,
                min_count=min_count,
                iter=epochs,  # Use 'iter' instead of 'epochs' for gensim
                sg=1,  # Skip-gram
                workers=multiprocessing.cpu_count(),
                **kwargs
            )
        
        training_time = time.time() - training_start
        logger.info(f"✅ Word2Vec training completed in {training_time:.2f}s")
        
        # Create wrapper and save
        logger.info(f"💾 Creating model wrapper and saving for index {index}")
        save_start = time.time()
        
        word2vec_model = Word2VecModel(
            index=index,
            model=model,
            created_at=datetime.now(timezone.utc)
        )
        
        self.models[index] = word2vec_model
        self._save_model(index, word2vec_model)
        
        save_time = time.time() - save_start
        total_time = time.time() - start_time
        
        logger.info(f"✅ Model wrapper created and saved in {save_time:.2f}s")
        logger.info(f"📊 Model statistics for {index}:")
        logger.info(f"   - Vocabulary size: {word2vec_model.vocab_size}")
        logger.info(f"   - Vector dimension: {word2vec_model.vector_dim}")
        logger.info(f"   - Total training time: {total_time:.2f}s")
        logger.info(f"🎉 Word2Vec training completed successfully for index: {index}")
        
        return word2vec_model
    
    
    
    
    def _preprocess_texts(self, texts: List[str]) -> List[List[str]]:
        """Simple text preprocessing - tokenization and basic cleaning."""
        processed = []
        for text in texts:
            # Simple tokenization - split on whitespace and basic punctuation
            tokens = text.lower().split()
            # Remove very short tokens and basic cleaning
            tokens = [token.strip('.,!?;:()[]{}"\'-') for token in tokens if len(token) > 2]
            if tokens:
                processed.append(tokens)
        return processed
    
    def _save_model(self, index: str, model: Word2VecModel):
        """Save a trained model to disk."""
        model_path = self.models_dir / f"word2vec_{index}.pkl"
        with open(model_path, 'wb') as f:
            pickle.dump(model, f)
        logger.info(f"Model saved to {model_path}")
    
    def load_model(self, index: str) -> Optional[Word2VecModel]:
        """Load a trained model from disk."""
        if index in self.models:
            return self.models[index]
        
        # Try to load from CADE model directory first
        cade_model_path = Path("model") / f"cade_{index}.model"
        if cade_model_path.exists():
            try:
                model = Word2Vec.load(str(cade_model_path))
                word2vec_model = Word2VecModel(
                    index=index,
                    model=model,
                    created_at=datetime.now(timezone.utc)
                )
                self.models[index] = word2vec_model
                logger.info(f"CADE model loaded from {cade_model_path}")
                return word2vec_model
            except Exception as e:
                logger.error(f"Failed to load CADE model for {index}: {e}")
        
        # Fall back to pickle format
        model_path = self.models_dir / f"word2vec_{index}.pkl"
        if model_path.exists():
            try:
                with open(model_path, 'rb') as f:
                    model = pickle.load(f)
                self.models[index] = model
                logger.info(f"Model loaded from {model_path}")
                return model
            except Exception as e:
                logger.error(f"Failed to load model for {index}: {e}")
                return None
        return None
    
    def align_models(self, reference_index: str) -> bool:
        """Align all models to a reference model using Procrustes alignment."""
        import time
        start_time = time.time()
        
        if reference_index not in self.models:
            logger.error(f"Reference index {reference_index} not found in models")
            return False
        
        self.reference_index = reference_index
        reference_model = self.models[reference_index]
        
        logger.info(f"🚀 Starting Procrustes alignment to reference index: {reference_index}")
        logger.info(f"📊 Total models to align: {len(self.models)}")
        
        # Get common vocabulary
        logger.info("🔍 Finding common vocabulary across all models...")
        vocab_start = time.time()
        common_words = self._get_common_vocabulary()
        vocab_time = time.time() - vocab_start
        
        if len(common_words) < 10:
            logger.warning(f"⚠️ Only {len(common_words)} common words found. Alignment may be poor.")
        else:
            logger.info(f"✅ Found {len(common_words)} common words in {vocab_time:.2f}s")
        
        # Create alignment matrix
        logger.info("🎯 Starting individual model alignment...")
        alignment_start = time.time()
        
        aligned_models = {}
        successful_alignments = 0
        
        for i, (index, model) in enumerate(self.models.items(), 1):
            if index == reference_index:
                aligned_models[index] = model
                logger.info(f"📌 Skipping reference model {index} (no alignment needed)")
                continue
            
            try:
                logger.info(f"📝 Aligning model {i}/{len(self.models)}: {index}")
                model_align_start = time.time()
                
                # Align this model to the reference
                aligned_model = self._align_single_model(model, reference_model, common_words)
                if aligned_model:
                    aligned_models[index] = aligned_model
                    self.models[index] = aligned_model
                    
                    model_align_time = time.time() - model_align_start
                    logger.info(f"   ✅ Model {index} aligned successfully in {model_align_time:.2f}s")
                    successful_alignments += 1
                else:
                    logger.warning(f"   ⚠️ Model {index} alignment failed (insufficient common words)")
                        
            except Exception as e:
                logger.error(f"   Failed to align model {index}: {str(e)}")
                continue
        
        alignment_time = time.time() - alignment_start
        total_time = time.time() - start_time
        
        logger.info(f"✅ Procrustes alignment completed in {total_time:.2f}s")
        logger.info(f"📊 Alignment statistics:")
        logger.info(f"   - Total models: {len(self.models)}")
        logger.info(f"   - Successfully aligned: {successful_alignments}")
        logger.info(f"   - Common vocabulary size: {len(common_words)}")
        logger.info(f"   - Alignment time: {alignment_time:.2f}s")
        
        return True
    
    def _get_common_vocabulary(self) -> List[str]:
        """Get vocabulary common to all models."""
        if not self.models:
            return []
        
        vocab_sets = []
        for model in self.models.values():
            vocab_sets.append(set(model.model.wv.vocab.keys()))
        
        common_vocab = set.intersection(*vocab_sets)
        return sorted(list(common_vocab))
    
    def _align_single_model(
        self, 
        source_model: Word2VecModel, 
        target_model: Word2VecModel, 
        common_words: List[str]
    ) -> Optional[Word2VecModel]:
        """Align a single model to the target model using Procrustes."""
        try:
            # Get vectors for common words
            source_vectors = []
            target_vectors = []
            
            for word in common_words:
                source_vec = source_model.get_word_vector(word)
                target_vec = target_model.get_word_vector(word)
                if source_vec is not None and target_vec is not None:
                    source_vectors.append(source_vec)
                    target_vectors.append(target_vec)
            
            if len(source_vectors) < 10:
                logger.warning(f"Insufficient common words for alignment: {len(source_vectors)}")
                return None
            
            source_matrix = np.array(source_vectors)
            target_matrix = np.array(target_vectors)
            
            # Procrustes alignment
            aligned_vectors = self._procrustes_align(source_matrix, target_matrix)
            
            # Create new aligned model
            aligned_model = Word2VecModel(
                index=source_model.index,
                model=source_model.model,
                created_at=source_model.created_at
            )
            
            # Update the word vectors with aligned ones
            for i, word in enumerate(common_words):
                if i < len(aligned_vectors):
                    aligned_model.model.wv[word] = aligned_vectors[i]
            
            return aligned_model
            
        except Exception as e:
            logger.error(f"Failed to align model {source_model.index}: {e}")
            return None
    
    def _procrustes_align(self, source: np.ndarray, target: np.ndarray) -> np.ndarray:
        """Perform Procrustes alignment between source and target matrices."""
        # Center the data
        source_centered = source - np.mean(source, axis=0)
        target_centered = target - np.mean(target, axis=0)
        
        # SVD decomposition
        U, _, Vt = np.linalg.svd(target_centered.T @ source_centered)
        
        # Rotation matrix
        R = U @ Vt
        
        # Apply transformation
        aligned = source_centered @ R.T + np.mean(target, axis=0)
        
        return aligned
    

    def get_neighbor_analysis_data(
        self, 
        word: str, 
        topn: int = 20
    ) -> Optional[Dict]:
        """
        Get neighbor analysis data for a specific word across all models.
        
        Args:
            word: The word to analyze
            topn: Number of top neighbors to retrieve
            
        Returns:
            Dictionary containing neighbor analysis data or None if word not found
        """
        if not self.models:
            return None
        
        neighbor_data = {
            "word": word,
            "models": {},
            "summary": {
                "total_models": len(self.models),
                "models_with_word": 0,
                "total_neighbors": 0
            }
        }
        
        total_neighbors = 0
        models_with_word = 0
        
        for index, model in self.models.items():
            # Check if word exists in this model
            if word not in model.model.wv.vocab:
                neighbor_data["models"][index] = {
                    "word_found": False,
                    "neighbors": [],
                    "message": f"Word '{word}' not found in vocabulary"
                }
                continue
            
            models_with_word += 1
            
            try:
                # Get most similar words
                similar_words = model.get_most_similar(word, topn=topn)
                total_neighbors += len(similar_words)
                
                # Format neighbor data
                neighbors = []
                for neighbor_word, similarity in similar_words:
                    neighbors.append({
                        "word": neighbor_word,
                        "similarity": float(similarity),
                        "rank": len(neighbors) + 1
                    })
                
                neighbor_data["models"][index] = {
                    "word_found": True,
                    "neighbors": neighbors,
                    "vocabulary_size": model.vocab_size,
                    "vector_dimensions": model.vector_dim,
                    "created_at": model.created_at.isoformat()
                }
                
            except Exception as e:
                logger.error(f"Error getting neighbors for '{word}' in model {index}: {str(e)}")
                neighbor_data["models"][index] = {
                    "word_found": False,
                    "neighbors": [],
                    "message": f"Error retrieving neighbors: {str(e)}"
                }
        
        # Update summary
        neighbor_data["summary"]["models_with_word"] = models_with_word
        neighbor_data["summary"]["total_neighbors"] = total_neighbors
        
        return neighbor_data if models_with_word > 0 else None

    def calculate_cosine_similarities(self, topics_with_terms: List[Dict]) -> List[Dict]:
        """
        Calculate cosine similarities between topics and their related terms across all aligned indexes.
        
        Args:
            topics_with_terms: List of topics with their related terms
            
        Returns:
            List of similarity data for plotting
        """
        if not self.models:
            return []
        
        similarity_data = []
        
        for topic_data in topics_with_terms:
            main_topic = topic_data["name"]
            related_terms = topic_data["related_terms"]
            
            for related_term in related_terms:
                term_name = related_term["term"]
                
                # Calculate similarity for each index
                for index in self.models.keys():
                    try:
                        # Check if both words exist in the vocabulary
                        if (main_topic in self.models[index].model.wv.vocab and 
                            term_name in self.models[index].model.wv.vocab):
                            
                            # Calculate cosine similarity
                            similarity = self.models[index].model.wv.similarity(main_topic, term_name)
                            
                            similarity_data.append({
                                "main_topic": main_topic,
                                "related_term": term_name,
                                "index": index,
                                "similarity": float(similarity),
                                "topic_id": topic_data["id"],
                                "term_id": related_term["id"]
                            })
                        else:
                            # If words don't exist, add None similarity
                            similarity_data.append({
                                "main_topic": main_topic,
                                "related_term": term_name,
                                "index": index,
                                "similarity": None,
                                "topic_id": topic_data["id"],
                                "term_id": related_term["id"]
                            })
                    except Exception as e:
                        logger.warning(f"Error calculating similarity for {main_topic} - {term_name} in {index}: {str(e)}")
                        similarity_data.append({
                            "main_topic": main_topic,
                            "related_term": term_name,
                            "index": index,
                            "similarity": None,
                            "topic_id": topic_data["id"],
                            "term_id": related_term["id"]
                        })
        
        return similarity_data

    def train_cade(
        self,
        papers_by_index: Dict[str, List[str]],
        vector_dim: int = 100,
        window: int = 20,
        min_count: int = 2,
        epochs: int = 20,
        progress_callback=None
    ) -> bool:
        """
        Simplified CADE training following the exact pattern specified.
        """
        import time
        start_time = time.time()
        
        if not CADE_AVAILABLE:
            logger.error("CADE library not available for compass alignment")
            return False
        
        try:
            logger.info("🚀 Starting simplified CADE training")
            logger.info(f"📊 CADE parameters: vector_dim={vector_dim}, window={window}, min_count={min_count}, epochs={epochs}")
            logger.info(f"📝 Processing {len(papers_by_index)} indexes")
            
            # Ensure directories exist
            temp_dir = Path("temp")
            temp_dir.mkdir(exist_ok=True)
            
            model_dir = Path("model")
            model_dir.mkdir(exist_ok=True)
            
            # Step 1: Create slice files and compass file
            logger.info("🔧 Creating slice files and compass file...")
            if progress_callback:
                progress_callback("Creating slice files and compass file...")
            
            compass_texts = []
            slice_files = {}
            
            for i, (index, texts) in enumerate(papers_by_index.items(), 1):
                logger.info(f"📝 Processing index {i}/{len(papers_by_index)}: {index} ({len(texts)} texts)")
                if progress_callback:
                    progress_callback(f"Processing index {i}/{len(papers_by_index)}: {index}")
                
                # Preprocess texts
                processed_texts = self._preprocess_texts(texts)
                slice_text = "\n".join([" ".join(sentence) for sentence in processed_texts])
                
                # Create slice file
                slice_file = temp_dir / f"cade_{index}.txt"
                with open(slice_file, 'w', encoding='utf-8') as f:
                    f.write(slice_text)
                
                slice_files[index] = slice_file
                compass_texts.append(slice_text)
            
            # Create compass file (concatenation of all slices)
            compass_file = temp_dir / "compass.txt"
            with open(compass_file, 'w', encoding='utf-8') as f:
                f.write("\n".join(compass_texts))
            
            logger.info(f"✅ Created compass file: {compass_file}")
            
            # Step 2: Initialize CADE aligner
            logger.info("🔧 Initializing CADE aligner...")
            if progress_callback:
                progress_callback("Initializing CADE aligner...")
            
            aligner = CADE(
                size=vector_dim,
                window=window,
                min_count=min_count,
                sg=1,
                workers=multiprocessing.cpu_count()
            )
            
            # Step 3: Train the compass
            logger.info("🎯 Training the compass...")
            if progress_callback:
                progress_callback("Training CADE compass...")
            
            aligner.train_compass(str(compass_file), overwrite=False)
            
            # Step 4: Train each slice (already aligned)
            logger.info("🎯 Training individual slices...")
            successful_slices = 0
            
            for i, (index, slice_file) in enumerate(slice_files.items(), 1):
                try:
                    logger.info(f"📝 Training slice {i}/{len(slice_files)}: {index}")
                    if progress_callback:
                        progress_callback(f"Training slice {i}/{len(slice_files)}: {index}")
                    
                    slice_model = aligner.train_slice(str(slice_file), save=True)
                    
                    # Save the model
                    model_path = model_dir / f"cade_{index}.model"
                    slice_model.save(str(model_path))
                    
                    # Create Word2VecModel wrapper
                    word2vec_model = Word2VecModel(
                        index=index,
                        model=slice_model,
                        created_at=datetime.now(timezone.utc)
                    )
                    self.models[index] = word2vec_model
                    
                    logger.info(f"✅ Slice {index} completed and saved to: {model_path}")
                    successful_slices += 1
                    
                except Exception as e:
                    logger.error(f"Failed to train slice for index {index}: {str(e)}")
                    continue
            
            # Clean up temporary files
            import shutil
            shutil.rmtree(temp_dir)
            
            total_time = time.time() - start_time
            logger.info(f"🎉 CADE training completed successfully in {total_time:.2f}s")
            logger.info(f"📊 Successfully trained {successful_slices}/{len(slice_files)} slices")
            
            return successful_slices > 0
            
        except Exception as e:
            total_time = time.time() - start_time
            logger.error(f"CADE training failed after {total_time:.2f}s: {str(e)}")
            return False
    
    def train_procrustes(
        self,
        papers_by_index: Dict[str, List[str]],
        vector_dim: int = 100,
        window: int = 20,
        min_count: int = 2,
        epochs: int = 20,
        progress_callback=None
    ) -> bool:
        """
        Simplified Procrustes training: train models then align them.
        """
        import time
        start_time = time.time()
        
        try:
            logger.info("🚀 Starting simplified Procrustes training")
            logger.info(f"📊 Procrustes parameters: vector_dim={vector_dim}, window={window}, min_count={min_count}, epochs={epochs}")
            logger.info(f"📝 Processing {len(papers_by_index)} indexes")
            
            # Step 1: Train individual Word2Vec models
            logger.info("🎯 Training individual Word2Vec models...")
            successful_models = 0
            
            for i, (index, texts) in enumerate(papers_by_index.items(), 1):
                try:
                    logger.info(f"📝 Training model {i}/{len(papers_by_index)}: {index}")
                    
                    # Create progress callback for this model
                    def model_progress_callback(message):
                        if progress_callback:
                            progress_callback(f"Model {i}/{len(papers_by_index)} ({index}): {message}")
                    
                    model = self.train_model(
                        index=index,
                        texts=texts,
                        vector_dim=vector_dim,
                        window=window,
                        min_count=min_count,
                        epochs=epochs,
                        progress_callback=model_progress_callback
                    )
                    successful_models += 1
                    
                except Exception as e:
                    logger.error(f"Failed to train model for index {index}: {str(e)}")
                    continue
            
            # Step 2: Align models using Procrustes
            if len(self.models) > 1:
                logger.info("🎯 Aligning models using Procrustes...")
                reference_index = list(self.models.keys())[0]
                success = self.align_models(reference_index)
                if not success:
                    logger.error("Procrustes alignment failed")
                    return False
            else:
                logger.info("ℹ️ Only one model trained, no alignment needed")
            
            total_time = time.time() - start_time
            logger.info(f"🎉 Procrustes training completed successfully in {total_time:.2f}s")
            logger.info(f"📊 Successfully trained {successful_models}/{len(papers_by_index)} models")
            
            return successful_models > 0
            
        except Exception as e:
            total_time = time.time() - start_time
            logger.error(f"Procrustes training failed after {total_time:.2f}s: {str(e)}")
            return False
    
    def load_model(self, model_path: str) -> Optional[Word2VecModel]:
        """
        Load a model from disk using gensim's load function.
        """
        try:
            model_path = Path(model_path)
            if not model_path.exists():
                logger.error(f"Model file not found: {model_path}")
                return None
            
            # Load using gensim
            model = Word2Vec.load(str(model_path))
            
            # Extract index from filename
            index = model_path.stem.replace("cade_", "").replace("word2vec_", "")
            
            # Create Word2VecModel wrapper
            word2vec_model = Word2VecModel(
                index=index,
                model=model,
                created_at=datetime.now(timezone.utc)
            )
            
            self.models[index] = word2vec_model
            logger.info(f"✅ Model loaded from: {model_path}")
            return word2vec_model
            
        except Exception as e:
            logger.error(f"Failed to load model from {model_path}: {str(e)}")
            return None

    def clear_models(self) -> bool:
        """Clear all models from memory and disk."""
        try:
            # Clear from memory
            self.models.clear()
            self.reference_index = None
            
            # Clear from disk
            import shutil
            if self.models_dir.exists():
                shutil.rmtree(self.models_dir)
                self.models_dir.mkdir(exist_ok=True)
            
            # Also clear CADE model directory
            cade_model_dir = Path("model")
            if cade_model_dir.exists():
                shutil.rmtree(cade_model_dir)
                cade_model_dir.mkdir(exist_ok=True)
            
            return True
        except Exception as e:
            logger.error(f"Failed to clear models: {str(e)}")
            return False
