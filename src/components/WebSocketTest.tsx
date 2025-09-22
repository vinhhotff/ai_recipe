import React, { useState } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Send, Bell, Users, MessageSquare, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export const WebSocketTest: React.FC = () => {
  const { socket, isConnected, notifications, unreadCount, markAllAsRead, clearNotifications } = useWebSocket();
  const [testMessage, setTestMessage] = useState('Hello from frontend!');

  const sendTestMessage = () => {
    if (!socket || !isConnected) {
      toast.error('WebSocket not connected');
      return;
    }

    socket.emit('test-message', {
      message: testMessage,
      timestamp: new Date().toISOString(),
    });
    
    toast.success('Test message sent!');
    setTestMessage('');
  };

  const simulateNotification = () => {
    if (!socket || !isConnected) {
      toast.error('WebSocket not connected');
      return;
    }

    socket.emit('simulate-notification', {
      type: 'test',
      title: 'Test Notification',
      message: 'This is a test notification from the frontend',
    });
    
    toast.info('Notification simulation sent!');
  };

  const simulateAdminAlert = () => {
    if (!socket || !isConnected) {
      toast.error('WebSocket not connected');
      return;
    }

    socket.emit('simulate-admin-alert', {
      type: 'system_alert',
      title: 'System Alert',
      message: 'High memory usage detected on server',
      priority: 'high',
    });
    
    toast.warning('Admin alert simulation sent!');
  };

  return (
    <div className="space-y-6">
      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            WebSocket Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <Badge 
              variant={isConnected ? "default" : "destructive"}
              className="flex items-center gap-2"
            >
              {isConnected ? "🟢 Connected" : "🔴 Disconnected"}
            </Badge>
            
            {isConnected ? (
              <div className="text-sm text-gray-600">
                ✅ Real-time features are active
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                ⚠️ WebSocket server on port 3003 is not running
              </div>
            )}
          </div>
          
          <div className="mt-4 text-xs text-gray-500">
            <div>• Backend API: Port 3001 (separate from WebSocket)</div>
            <div>• WebSocket Server: Port 3003</div>
            <div>• Frontend Dev Server: Port 3000</div>
          </div>
        </CardContent>
      </Card>

      {/* Test Controls */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="w-5 h-5" />
              WebSocket Test Controls
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Test Message */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Send Test Message</label>
              <div className="flex gap-2">
                <Input 
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Enter test message..."
                  onKeyPress={(e) => e.key === 'Enter' && sendTestMessage()}
                />
                <Button onClick={sendTestMessage}>
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Simulation Buttons */}
            <div className="flex gap-2">
              <Button onClick={simulateNotification} variant="outline">
                <Bell className="w-4 h-4 mr-2" />
                Test Notification
              </Button>
              
              <Button onClick={simulateAdminAlert} variant="outline">
                <AlertCircle className="w-4 h-4 mr-2" />
                Admin Alert
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            Real-time Notifications
            {unreadCount > 0 && (
              <Badge variant="destructive" className="ml-2">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {notifications.length > 0 ? (
            <div className="space-y-4">
              <div className="flex gap-2 mb-4">
                <Button onClick={markAllAsRead} size="sm" variant="outline">
                  Mark All Read
                </Button>
                <Button onClick={clearNotifications} size="sm" variant="outline">
                  Clear All
                </Button>
              </div>
              
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {notifications.slice(0, 10).map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border ${
                      notification.read 
                        ? 'bg-gray-50 border-gray-200' 
                        : 'bg-blue-50 border-blue-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium text-sm">{notification.title}</div>
                        <div className="text-sm text-gray-600 mt-1">
                          {notification.message}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge 
                          variant="outline" 
                          className="text-xs"
                        >
                          {notification.type}
                        </Badge>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-2">
                      {new Date(notification.timestamp).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <div className="text-sm">No notifications yet</div>
              <div className="text-xs text-gray-400 mt-1">
                {isConnected 
                  ? "Notifications will appear here when received"
                  : "Connect WebSocket to receive notifications"
                }
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Setup Instructions */}
      {!isConnected && (
        <Card className="border-orange-200 bg-orange-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800">
              <AlertCircle className="w-5 h-5" />
              WebSocket Setup Instructions
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-orange-700 space-y-2">
            <div className="font-medium">To test WebSocket features:</div>
            <ol className="list-decimal list-inside space-y-1">
              <li>Start your WebSocket server on port 3003</li>
              <li>Set <code className="bg-orange-100 px-1 rounded">VITE_ENABLE_WEBSOCKET=true</code> in .env.local</li>
              <li>Restart the frontend development server</li>
              <li>Login to see real-time features</li>
            </ol>
            
            <div className="mt-4 p-3 bg-orange-100 rounded-lg">
              <div className="font-medium mb-1">Current Configuration:</div>
              <div className="font-mono text-xs">
                <div>VITE_WEBSOCKET_URL: {import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3003'}</div>
                <div>VITE_ENABLE_WEBSOCKET: {import.meta.env.VITE_ENABLE_WEBSOCKET || 'false'}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
