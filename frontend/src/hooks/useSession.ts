import { useState, useEffect, useCallback } from 'react';
import apiService from '@/services/api';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1';

export type SystemStatus = 'available' | 'occupied';

export interface SessionState {
  hasActiveSession: boolean;
  timeRemaining: number;
  systemStatus: SystemStatus;
  isLoading: boolean;
  error: string | null;
}

export const useSession = () => {
  const [state, setState] = useState<SessionState>({
    hasActiveSession: false,
    timeRemaining: 0,
    systemStatus: 'available', 
    isLoading: true,
    error: null,
  });

  const checkSessionStatus = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Clear any stale session from localStorage if backend is not available
      try {
        const statusResponse = await fetch(`${API_BASE_URL}/sessions/status`);
        if (!statusResponse.ok) {
          // Backend is not responding properly, clear any stored session
          localStorage.removeItem('session_id');
        }
      } catch {
        // Backend is not available, clear any stored session
        localStorage.removeItem('session_id');
      }

      // First, check if we have a valid session
      if (apiService.hasValidSession()) {
        try {
          const sessionInfo = await apiService.getSessionInfo();
          if (sessionInfo && sessionInfo.is_active) {
            setState({
              hasActiveSession: true,
              timeRemaining: sessionInfo.time_remaining_seconds,
              systemStatus: 'occupied',
              isLoading: false,
              error: null,
            });
            return;
          }
        } catch {
          // Session is invalid, clear it and check system status
          console.warn('Invalid session detected, clearing...');
        }
      }

      // No valid session, check system availability
      const statusResponse = await fetch(`${API_BASE_URL}/sessions/status`);
      const statusData = await statusResponse.json();
      
      setState({
        hasActiveSession: false,
        timeRemaining: 0,
        systemStatus: statusData.system_status,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Failed to check session status:', error);
      setState({
        hasActiveSession: false,
        timeRemaining: 0,
        systemStatus: 'available',
        isLoading: false,
        error: 'Backend server not available',
      });
    }
  }, []);

  const startSession = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const result = await apiService.createSession();
      
      setState({
        hasActiveSession: true,
        timeRemaining: 30 * 60, // 30 minutes
        systemStatus: 'occupied',
        isLoading: false,
        error: null,
      });
      
      return { success: true, message: result.message };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start session';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      return { success: false, message: errorMessage };
    }
  }, []);

  const endSession = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      await apiService.terminateSession();
      
      setState({
        hasActiveSession: false,
        timeRemaining: 0,
        systemStatus: 'available',
        isLoading: false,
        error: null,
      });
      
      return { success: true, message: 'Session terminated successfully' };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to end session';
      setState(prev => ({ ...prev, isLoading: false, error: errorMessage }));
      return { success: false, message: errorMessage };
    }
  }, []);

  useEffect(() => {
    checkSessionStatus();
  }, [checkSessionStatus]);

  // Timer for active sessions
  useEffect(() => {
    if (state.hasActiveSession && state.timeRemaining > 0) {
      const timer = setInterval(() => {
        setState(prev => ({
          ...prev,
          timeRemaining: Math.max(0, prev.timeRemaining - 1),
        }));
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [state.hasActiveSession, state.timeRemaining]);

  // Auto-refresh system status when session expires
  useEffect(() => {
    if (state.hasActiveSession && state.timeRemaining <= 0) {
      setTimeout(() => {
        checkSessionStatus();
      }, 1000);
    }
  }, [state.hasActiveSession, state.timeRemaining, checkSessionStatus]);

  return {
    ...state,
    checkSessionStatus,
    startSession,
    endSession,
  };
};
