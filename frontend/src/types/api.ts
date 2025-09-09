/**
 * API types for the diachronic data visualization tool
 */

export interface ApiError {
  detail: string;
  status_code: number;
}

export interface HealthCheckResponse {
  status: string;
  service?: string;
  timestamp?: string;
}

export interface UploadStats {
  total_indexes: number;
  total_tokens: number;
  total_characters: number;
  unique_indexes: number;
  unique_index_list: string[];
}

export interface TrainingSettings {
  vector_dim: number;
  window: number;
  min_count: number;
  epochs: number;
  alignment_method: "procrustes" | "compass";
}

export interface TrainingResponse {
  message: string;
  indexes: string[];
  session_id: string;
  settings: TrainingSettings;
}

export interface TrainingStatusResponse {
  session_id: string;
  status: "not_found" | "running" | "completed" | "failed" | "unknown";
  message: string;
  start_time?: string;
  end_time?: string;
  progress?: {
    current_step: string;
    total_steps: number;
    current_step_number: number;
    message: string;
  };
  error?: string;
  total_time?: number;
  training_time?: number;
}

export interface NeighborData {
  word: string;
  similarity: number;
  rank: number;
}

export interface ModelNeighborInfo {
  word_found: boolean;
  neighbors: NeighborData[];
  vocabulary_size?: number;
  vector_dimensions?: number;
  created_at?: string;
  message?: string;
}

export interface NeighborAnalysisData {
  word: string;
  models: Record<string, ModelNeighborInfo>;
  summary: {
    total_models: number;
    models_with_word: number;
    total_neighbors: number;
  };
}

export interface ClearModelsResponse {
  message: string;
  models_cleared: boolean;
}

export interface Topic {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface TopicCreate {
  name: string;
}

export interface TopicUpdate {
  name?: string;
  updated_at?: string;
}

export interface RelatedTerm {
  id: number;
  topic_id: number;
  term: string;
  created_at: string;
}

export interface RelatedTermCreate {
  topic_id: number;
  term: string;
}

export interface TopicWithTerms {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
  related_terms: RelatedTerm[];
}

export interface TermsTableData {
  topics: string[];
  related_terms: string[];
}

export interface DeleteResponse {
  message: string;
}

export interface CosineSimilarityData {
  main_topic: string;
  related_term: string;
  index: string;
  similarity: number | null;
  topic_id: number;
  term_id: number;
}

export interface CosineSimilaritiesResponse {
  similarities: CosineSimilarityData[];
  total_calculations: number;
  message: string;
} 