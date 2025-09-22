import React, { useState, useEffect } from 'react';
import { AlertTriangle, Code, Wifi, WifiOff, Server } from 'lucide-react';
import { isDevelopmentMode } from '@/lib/mockData';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { apiClientWithFallback } from '@/lib/api-client-with-fallback';

export const DevelopmentBanner: React.FC = () => {
  const { isConnected } = useWebSocket();
  const [backendStatus, setBackendStatus] = useState<{
    isOnline: boolean;
    lastCheck: Date;
  }>({ isOnline: false, lastCheck: new Date() });

  useEffect(() => {
    const checkStatus = () => {
      const status = apiClientWithFallback.getBackendStatus();
      setBackendStatus(status);
    };
    
    checkStatus();
    const interval = setInterval(checkStatus, 5000); // Check every 5 seconds
    
    return () => clearInterval(interval);
  }, []);

  if (!isDevelopmentMode()) {
    return null;
  }

  return (
    <div className={`border-b px-4 py-2 ${
      backendStatus.isOnline 
        ? 'bg-green-50 border-green-200' 
        : 'bg-yellow-50 border-yellow-200'
    }`}>
      <div className="flex items-center justify-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <Code className="h-4 w-4 text-blue-600" />
          <span className="text-gray-800">
            <strong>Development Mode</strong>
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Server className={`h-4 w-4 ${
            backendStatus.isOnline ? 'text-green-600' : 'text-orange-600'
          }`} />
          <span className={backendStatus.isOnline ? 'text-green-800' : 'text-orange-800'}>
            Backend: {backendStatus.isOnline ? 'Online (Real Data)' : 'Offline (Mock Data)'}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {isConnected ? (
            <>
              <Wifi className="h-4 w-4 text-green-600" />
              <span className="text-green-700">WebSocket: Online</span>
            </>
          ) : (
            <>
              <WifiOff className="h-4 w-4 text-gray-500" />
              <span className="text-gray-600">WebSocket: Offline</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
