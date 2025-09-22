import React, { useState, useEffect } from 'react';
import { apiClientWithFallback } from '../../lib/api-client-with-fallback';
import { cn } from '../../lib/utils';

interface BackendStatusIndicatorProps {
  className?: string;
  showLabel?: boolean;
}

export const BackendStatusIndicator: React.FC<BackendStatusIndicatorProps> = ({
  className,
  showLabel = false,
}) => {
  const [status, setStatus] = useState<{
    isOnline: boolean;
    lastCheck: Date;
  }>({ isOnline: true, lastCheck: new Date() });

  useEffect(() => {
    // Initial check
    checkStatus();

    // Check status every 30 seconds
    const interval = setInterval(checkStatus, 30000);

    return () => clearInterval(interval);
  }, []);

  const checkStatus = async () => {
    try {
      const isOnline = await apiClientWithFallback.isBackendOnline();
      setStatus({
        isOnline,
        lastCheck: new Date(),
      });
    } catch (error) {
      setStatus(prev => ({
        ...prev,
        isOnline: false,
        lastCheck: new Date(),
      }));
    }
  };

  const getStatusColor = () => {
    return status.isOnline 
      ? 'bg-green-500' 
      : 'bg-orange-500';
  };

  const getStatusText = () => {
    if (status.isOnline) {
      return 'Backend Online';
    } else {
      return 'Using Mock Data';
    }
  };

  const getStatusDescription = () => {
    if (status.isOnline) {
      return 'Connected to live backend services';
    } else {
      return 'Backend unavailable, using mock data for development';
    }
  };

  return (
    <div 
      className={cn("flex items-center gap-2", className)}
      title={getStatusDescription()}
    >
      <div className={cn(
        "w-2 h-2 rounded-full flex-shrink-0",
        getStatusColor(),
        status.isOnline ? "animate-pulse" : ""
      )} />
      
      {showLabel && (
        <span className={cn(
          "text-xs font-medium",
          status.isOnline ? "text-green-600" : "text-orange-600"
        )}>
          {getStatusText()}
        </span>
      )}
    </div>
  );
};

export default BackendStatusIndicator;
