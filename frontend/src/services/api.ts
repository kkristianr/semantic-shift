/**
 * API service for communicating with the backend
 */
import axios, { AxiosInstance } from 'axios';
import type { NeighborAnalysisData } from '@/types/api';

// API Base URL configuration
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

// API response types
export interface UploadResponse {
  message: string;
  papers_created: number;
  papers_skipped: number;
  total_rows: number;
  session_id: string;
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
  alignment_method: string;
}

export interface TrainingResponse {
  message: string;
  indexes: string[];
  session_id: string;
  method: string;
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
    epoch_progress?: number;
    detailed_message?: string;
  };
  error?: string;
  total_time?: number;
  training_time?: number;
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

export interface DeleteResponse {
  message: string;
}

// Session management types
export interface SessionInfo {
  session_id: string;
  created_at: string;
  expires_at: string;
  time_remaining_seconds: number;
  is_active: boolean;
}

class ApiService {
  private api: AxiosInstance;
  private sessionId: string | null = null;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
    });

    // Load session ID from localStorage on initialization
    this.loadSessionFromStorage();

    // Add request interceptor to include session ID
    this.api.interceptors.request.use((config) => {
      if (this.sessionId) {
        config.headers['X-Session-ID'] = this.sessionId;
      }
      return config;
    });

    // Add response interceptor to handle session expiration and system occupied
    this.api.interceptors.response.use(
      (response) => response,
      (error: unknown) => {
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response?: { status?: number; data?: { detail?: string } } };
          if (axiosError.response?.status === 401 && axiosError.response?.data?.detail?.includes('Session expired')) {
            this.clearSession();
            // Don't reload the page automatically - let the hook handle it
            console.warn('Session expired, clearing local session');
          } else if (axiosError.response?.status === 409 && axiosError.response?.data?.detail?.includes('System is currently occupied')) {
            // System is occupied - don't reload, just show the error
            console.warn('System is occupied:', axiosError.response.data?.detail);
            // The error will be handled by the calling component
          }
        }
        return Promise.reject(error);
      }
    );
  }

  async createSession(): Promise<{ 
    session_id: string; 
    message: string; 
    expires_in: string;
    data_cleared: boolean;
    papers_deleted: number;
    topics_deleted: number;
    terms_deleted: number;
  }> {
    try {
      const response = await this.api.post<{ 
        session_id: string; 
        message: string; 
        expires_in: string;
        data_cleared: boolean;
        papers_deleted: number;
        topics_deleted: number;
        terms_deleted: number;
      }>('/sessions/create');
      this.sessionId = response.data.session_id;
      this.saveSessionToStorage();
      return response.data;
    } catch (error: unknown) {
      // Check if it's an Axios error with response
      if (error && typeof error === 'object' && 'response' in error) {
        const axiosError = error as { response?: { status?: number } };
        if (axiosError.response?.status === 409) {
          // System is occupied by another user
          throw new Error('SYSTEM_OCCUPIED: Another session is currently active. Please wait for it to expire.');
        }
      }
      throw error;
    }
  }

  async getSessionInfo(): Promise<SessionInfo> {
    const response = await this.api.get<SessionInfo>('/sessions/info');
    return response.data;
  }

  async terminateSession(): Promise<{ 
    message: string; 
    status: string;
    data_cleared: boolean;
    papers_deleted: number;
    topics_deleted: number;
    terms_deleted: number;
  }> {
    const response = await this.api.delete<{ 
      message: string; 
      status: string;
      data_cleared: boolean;
      papers_deleted: number;
      topics_deleted: number;
      terms_deleted: number;
    }>('/sessions/terminate');
    this.clearSession();
    return response.data;
  }

  async clearAllData(): Promise<{
    message: string;
    papers_deleted: number;
    topics_deleted: number;
    terms_deleted: number;
    status: string;
  }> {
    const response = await this.api.post<{
      message: string;
      papers_deleted: number;
      topics_deleted: number;
      terms_deleted: number;
      status: string;
    }>('/sessions/clear-all-data');
    return response.data;
  }

  getSessionId(): string | null {
    return this.sessionId;
  }

  hasValidSession(): boolean {
    return !!this.sessionId;
  }

  private loadSessionFromStorage(): void {
    try {
      const storedSessionId = localStorage.getItem('session_id');
      if (storedSessionId) {
        this.sessionId = storedSessionId;
      }
    } catch (error) {
      console.warn('Failed to load session from localStorage:', error);
    }
  }

  private saveSessionToStorage(): void {
    try {
      if (this.sessionId) {
        localStorage.setItem('session_id', this.sessionId);
      } else {
        localStorage.removeItem('session_id');
      }
    } catch (error) {
      console.warn('Failed to save session to localStorage:', error);
    }
  }

  private clearSession(): void {
    this.sessionId = null;
    this.saveSessionToStorage();
  }

  async uploadCSV(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await this.api.post<UploadResponse>('/data/upload-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async getUploadStatistics(): Promise<UploadStats> {
    const response = await this.api.get<UploadStats>('/data/statistics');
    return response.data;
  }

  async clearAllPapers(): Promise<{ message: string }> {
    const response = await this.api.delete<{ message: string }>('/data/papers');
    return response.data;
  }

  async trainModels(settings: TrainingSettings): Promise<TrainingResponse> {
    const response = await this.api.post<TrainingResponse>('/word2vec/train-models', null, {
      params: {
        vector_dim: settings.vector_dim,
        window: settings.window,
        min_count: settings.min_count,
        epochs: settings.epochs,
        alignment_method: settings.alignment_method
      },
      timeout: 0 // No timeout for training requests
    });
    return response.data;
  }

  async getTrainingStatus(sessionId: string): Promise<TrainingStatusResponse> {
    const response = await this.api.get<TrainingStatusResponse>(`/word2vec/training-status/${sessionId}`);
    return response.data;
  }

  async getNeighborAnalysis(
    word: string,
    topn: number = 20
  ): Promise<NeighborAnalysisData> {
    const response = await this.api.get<NeighborAnalysisData>(`/word2vec/neighbor-analysis/${word}`, {
      params: { topn }
    });
    return response.data;
  }

  async clearModels(): Promise<ClearModelsResponse> {
    const response = await this.api.delete<ClearModelsResponse>('/word2vec/models');
    return response.data;
  }

  async getTopics(): Promise<Topic[]> {
    const response = await this.api.get<Topic[]>('/terms/topics');
    return response.data;
  }

  async getTopicsWithTerms(): Promise<TopicWithTerms[]> {
    const response = await this.api.get<TopicWithTerms[]>('/terms/topics/with-terms');
    return response.data;
  }

  async getTopic(topicId: number): Promise<Topic> {
    const response = await this.api.get<Topic>(`/terms/topics/${topicId}`);
    return response.data;
  }

  async createTopic(topic: TopicCreate): Promise<Topic> {
    const response = await this.api.post<Topic>('/terms/topics', topic);
    return response.data;
  }

  async updateTopic(topicId: number, topic: TopicUpdate): Promise<Topic> {
    const response = await this.api.put<Topic>(`/terms/topics/${topicId}`, topic);
    return response.data;
  }

  async deleteTopic(topicId: number): Promise<DeleteResponse> {
    const response = await this.api.delete<DeleteResponse>(`/terms/topics/${topicId}`);
    return response.data;
  }

  async getRelatedTerms(topicId: number): Promise<RelatedTerm[]> {
    const response = await this.api.get<RelatedTerm[]>(`/terms/topics/${topicId}/terms`);
    return response.data;
  }

  async addRelatedTerm(topicId: number, relatedTerm: RelatedTermCreate): Promise<RelatedTerm> {
    const response = await this.api.post<RelatedTerm>(`/terms/topics/${topicId}/terms`, relatedTerm);
    return response.data;
  }

  async removeRelatedTerm(topicId: number, termId: number): Promise<DeleteResponse> {
    const response = await this.api.delete<DeleteResponse>(`/terms/topics/${topicId}/terms/${termId}`);
    return response.data;
  }

  async getCosineSimilarities(): Promise<{ similarities: Array<{ main_topic: string; related_term: string; index: string; similarity: number | null; topic_id: number; term_id: number }> }> {
    const response = await this.api.get('/word2vec/cosine-similarities');
    return response.data;
  }


}


export default new ApiService(); 