import { useSession } from '@/hooks/useSession';

const SessionTimer = () => {
  const { hasActiveSession, timeRemaining, systemStatus, isLoading } = useSession();

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTimerColor = (seconds: number): string => {
    if (seconds <= 0) return 'text-red-600';
    if (seconds <= 300) return 'text-yellow-600'; // <= 5 minutes
    return 'text-green-600'; // > 5 minutes
  };

  const getTimerBgColor = (seconds: number): string => {
    if (seconds <= 0) return 'bg-red-100';
    if (seconds <= 300) return 'bg-yellow-100'; // <= 5 minutes
    return 'bg-green-100'; // > 5 minutes
  };

  if (isLoading) {
    return (
      <div className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        Loading...
      </div>
    );
  }

  if (hasActiveSession) {
    return (
      <div className={`px-3 py-1 rounded-full text-xs font-medium ${getTimerBgColor(timeRemaining)} ${getTimerColor(timeRemaining)}`}>
        {formatTime(timeRemaining)}
      </div>
    );
  }

  if (systemStatus === 'occupied') {
    return (
      <div className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-600">
        System occupied
      </div>
    );
  }

  return (
    <div className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-600">
      System available
    </div>
  );
};

export default SessionTimer;
