import React from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Badge } from '@/components/ui/badge';

interface WebSocketStatusProps {
  showText?: boolean;
  className?: string;
}

export const WebSocketStatus: React.FC<WebSocketStatusProps> = ({ 
  showText = false, 
  className = '' 
}) => {
  const { isConnected } = useWebSocket();

  if (showText) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {isConnected ? (
          <>
            <Wifi className="h-4 w-4 text-green-500" />
            <span className="text-sm text-green-700">Connected</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4 text-red-500" />
            <span className="text-sm text-red-700">Disconnected</span>
          </>
        )}
      </div>
    );
  }

  return (
    <Badge 
      variant="outline" 
      className={`flex items-center gap-1 ${
        isConnected 
          ? 'border-green-200 bg-green-50 text-green-700' 
          : 'border-red-200 bg-red-50 text-red-700'
      } ${className}`}
    >
      {isConnected ? (
        <>
          <Wifi className="h-3 w-3" />
          <span className="text-xs">Live</span>
        </>
      ) : (
        <>
          <WifiOff className="h-3 w-3" />
          <span className="text-xs">Offline</span>
        </>
      )}
    </Badge>
  );
};
