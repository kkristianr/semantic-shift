import { useState } from 'react';
import { useSession } from '@/hooks/useSession';
import { Button } from '@/components/ui';

const SessionHeader = () => {
  const { 
    hasActiveSession, 
    timeRemaining, 
    systemStatus, 
    isLoading, 
    error,
    startSession, 
    endSession, 
    checkSessionStatus 
  } = useSession();
  
  const [message, setMessage] = useState<string>('');

  const handleStartSession = async () => {
    const result = await startSession();
    setMessage(result.message);
    
    // Clear message after 5 seconds
    setTimeout(() => setMessage(''), 5000);
  };

  const handleEndSession = async () => {
    const result = await endSession();
    setMessage(result.message);
    
    // Clear message after 5 seconds
    setTimeout(() => setMessage(''), 5000);
  };

  const handleRefresh = async () => {
    setMessage('Checking system status...');
    await checkSessionStatus();
    setMessage('Status updated');
    
    // Clear message after 3 seconds
    setTimeout(() => setMessage(''), 3000);
  };

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getStatusColor = () => {
    if (hasActiveSession) {
      if (timeRemaining <= 300) return 'text-yellow-600'; // <= 5 minutes
      return 'text-green-600'; // > 5 minutes
    }
    if (systemStatus === 'occupied') return 'text-orange-600';
    return 'text-blue-600';
  };

  const getStatusBgColor = () => {
    if (hasActiveSession) {
      if (timeRemaining <= 300) return 'bg-yellow-100'; // <= 5 minutes
      return 'bg-green-100'; // > 5 minutes
    }
    if (systemStatus === 'occupied') return 'bg-orange-100';
    return 'bg-blue-100';
  };

  const getStatusText = () => {
    if (hasActiveSession) {
      return `Active session: ${formatTime(timeRemaining)}`;
    }
    if (systemStatus === 'occupied') {
      return 'System occupied';
    }
    return 'System available';
  };

  return (
    <div className="bg-gray-70 border-b border-gray-200 px-4 py-2">
      <div className="flex justify-between">
        <div className="flex items-center space-x-4">
          <div className={`px-3 py-1 rounded-full text-xs ${getStatusBgColor()} ${getStatusColor()}`}>
            {getStatusText()}
          </div>
          
          {(message || error) && (
            <div className="text-sm text-gray-500">
              {error || message}
            </div>
          )}
        </div>

        <div className="flex items-center space-x-2">
          {!hasActiveSession && systemStatus === 'available' && (
            <Button
              onClick={handleStartSession}
              disabled={isLoading}
              variant="success"
              size="sm"
              isLoading={isLoading}
            >
              Start session
            </Button>
          )}
          
          {hasActiveSession && (
            <Button
              onClick={handleEndSession}
              disabled={isLoading}
              variant="danger"
              size="sm"
              isLoading={isLoading}
            >
              Terminate session
            </Button>
          )}
          
          <Button
            onClick={handleRefresh}
            disabled={isLoading}
            variant="secondary"
            size="sm"
            title="Check if system status has changed (e.g., if another user's session expired)"
          >
            Refresh
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SessionHeader;
