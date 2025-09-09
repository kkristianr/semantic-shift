/**
 * Utility functions for handling API errors consistently
 */

export interface ApiError {
  status: number;
  message: string;
  detail?: string;
}

export function handleApiError(error: unknown): ApiError {
  if (error && typeof error === 'object' && 'response' in error) {
    const axiosError = error as { response?: { status?: number; data?: { detail?: string } } };
    
    if (axiosError.response?.status === 409) {
      return {
        status: 409,
        message: 'System is currently occupied by another user.',
        detail: axiosError.response.data?.detail || 'Please wait for their session to expire before accessing the system.'
      };
    }
    
    if (axiosError.response?.status === 401) {
      return {
        status: 401,
        message: 'Session expired or invalid.',
        detail: axiosError.response.data?.detail || 'Please refresh the page to get a new session.'
      };
    }
    
    return {
      status: axiosError.response?.status || 500,
      message: 'An error occurred while processing your request.',
      detail: axiosError.response?.data?.detail || 'Please try again later.'
    };
  }
  
  return {
    status: 500,
    message: 'An unexpected error occurred.',
    detail: 'Please try again later.'
  };
}

export function isSystemOccupiedError(error: unknown): boolean {
  const apiError = handleApiError(error);
  return apiError.status === 409;
}

export function isSessionExpiredError(error: unknown): boolean {
  const apiError = handleApiError(error);
  return apiError.status === 401;
}
