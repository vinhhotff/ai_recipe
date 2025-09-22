import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface NotificationData {
  id: string;
  type: 'user_registered' | 'recipe_submitted' | 'comment_added' | 'recipe_approved' | 'recipe_flagged' | 'system_alert';
  title: string;
  message: string;
  data?: any;
  timestamp: string;
  userId?: string;
  read: boolean;
}

interface WebSocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  notifications: NotificationData[];
  unreadCount: number;
  markNotificationAsRead: (id: string) => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

interface WebSocketProviderProps {
  children: React.ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptRef = useRef(0);

  const WEBSOCKET_URL = import.meta.env.VITE_WEBSOCKET_URL || 'ws://localhost:3003';

  useEffect(() => {
    let currentSocket: Socket | null = null;
    
    if (!isAuthenticated || !user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    // Skip WebSocket if explicitly disabled
    const isWebSocketEnabled = import.meta.env.VITE_ENABLE_WEBSOCKET === 'true';
    if (!isWebSocketEnabled) {
      setIsConnected(false);
      return;
    }

    // Prevent multiple connections
    if (socket && socket.connected) {
      return;
    }

    // Initialize socket connection with error handling
    currentSocket = io(WEBSOCKET_URL, {
      auth: {
        userId: user.id,
        role: user.role,
      },
      transports: ['websocket', 'polling'],
      timeout: 10000,
      reconnectionAttempts: 3, // Reduce attempts to avoid spam
      reconnectionDelay: 2000,
      autoConnect: true,
    });
    const newSocket = currentSocket;

    // Connection event handlers
    newSocket.on('connect', () => {
      setIsConnected(true);
      reconnectAttemptRef.current = 0;
      
      // Join room based on user role
      if (user.role === 'ADMIN') {
        newSocket.emit('join-admin-room');
      }
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
      
      // Handle reconnection for unexpected disconnects
      if (reason === 'io server disconnect') {
        // Server disconnected, attempt to reconnect
        attemptReconnect();
      }
    });

    newSocket.on('connect_error', (error) => {
      setIsConnected(false);
    });

    // Notification handlers
    newSocket.on('notification', (notification: NotificationData) => {
      console.log('Received notification:', notification);
      
      // Add notification to list
      setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep only last 50 notifications
      
      // Show toast notification based on type
      showNotificationToast(notification);
    });

    // Admin-specific events
    if (user.role === 'ADMIN') {
      newSocket.on('admin-alert', (data: NotificationData) => {
        console.log('Admin alert received:', data);
        setNotifications(prev => [data, ...prev].slice(0, 50));
        toast.error(`Admin Alert: ${data.message}`, {
          duration: 10000, // Show admin alerts longer
        });
      });

      newSocket.on('user-registered', (data) => {
        const notification: NotificationData = {
          id: Date.now().toString(),
          type: 'user_registered',
          title: 'New User Registration',
          message: `${data.firstName} ${data.lastName} just registered`,
          data,
          timestamp: new Date().toISOString(),
          read: false,
        };
        setNotifications(prev => [notification, ...prev].slice(0, 50));
        toast.info(notification.message);
      });

      newSocket.on('recipe-submitted', (data) => {
        const notification: NotificationData = {
          id: Date.now().toString(),
          type: 'recipe_submitted',
          title: 'Recipe Pending Approval',
          message: `"${data.title}" needs review`,
          data,
          timestamp: new Date().toISOString(),
          read: false,
        };
        setNotifications(prev => [notification, ...prev].slice(0, 50));
        toast.info(notification.message);
      });

      newSocket.on('recipe-flagged', (data) => {
        const notification: NotificationData = {
          id: Date.now().toString(),
          type: 'recipe_flagged',
          title: 'Recipe Flagged',
          message: `"${data.title}" has been flagged: ${data.reason}`,
          data,
          timestamp: new Date().toISOString(),
          read: false,
        };
        setNotifications(prev => [notification, ...prev].slice(0, 50));
        toast.warning(notification.message);
      });
    }

    // User-specific events
    newSocket.on('recipe-approved', (data) => {
      if (data.authorId === user.id) {
        const notification: NotificationData = {
          id: Date.now().toString(),
          type: 'recipe_approved',
          title: 'Recipe Approved!',
          message: `Your recipe "${data.title}" has been approved`,
          data,
          timestamp: new Date().toISOString(),
          userId: user.id,
          read: false,
        };
        setNotifications(prev => [notification, ...prev].slice(0, 50));
        toast.success(notification.message);
      }
    });

    newSocket.on('comment-added', (data) => {
      if (data.recipeAuthorId === user.id && data.commentAuthorId !== user.id) {
        const notification: NotificationData = {
          id: Date.now().toString(),
          type: 'comment_added',
          title: 'New Comment',
          message: `${data.author} commented on your recipe "${data.recipeTitle}"`,
          data,
          timestamp: new Date().toISOString(),
          userId: user.id,
          read: false,
        };
        setNotifications(prev => [notification, ...prev].slice(0, 50));
        toast.info(notification.message);
      }
    });

    // Real-time dashboard updates (admin only)
    if (user.role === 'ADMIN') {
      newSocket.on('dashboard-metrics-update', (metrics) => {
        // Trigger dashboard data refresh
        window.dispatchEvent(new CustomEvent('dashboard-update', { detail: metrics }));
      });

      newSocket.on('user-activity', (activity) => {
        // Real-time user activity feed
        window.dispatchEvent(new CustomEvent('user-activity', { detail: activity }));
      });
    }

    setSocket(newSocket);

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (currentSocket) {
        currentSocket.close();
      }
    };
  }, [WEBSOCKET_URL, isAuthenticated, user]);

  const attemptReconnect = () => {
    if (reconnectAttemptRef.current >= 3) { // Reduce max attempts
      console.log('Max WebSocket reconnection attempts reached - will work in offline mode');
      return; // Don't show error toast, just work offline
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      reconnectAttemptRef.current += 1;
      console.log(`WebSocket reconnection attempt ${reconnectAttemptRef.current}`);
      // Don't show toast notifications for reconnection attempts
    }, 5000 * reconnectAttemptRef.current); // Linear backoff
  };

  const showNotificationToast = (notification: NotificationData) => {
    switch (notification.type) {
      case 'recipe_approved':
        toast.success(notification.message);
        break;
      case 'recipe_flagged':
        toast.error(notification.message);
        break;
      case 'comment_added':
        toast.info(notification.message);
        break;
      case 'user_registered':
        toast.info(notification.message);
        break;
      case 'recipe_submitted':
        toast.info(notification.message);
        break;
      case 'system_alert':
        toast.warning(notification.message, { duration: 10000 });
        break;
      default:
        toast(notification.message);
    }
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(notification =>
        notification.id === id ? { ...notification, read: true } : notification
      )
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev =>
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  const clearNotifications = () => {
    setNotifications([]);
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const value: WebSocketContextType = {
    socket,
    isConnected,
    notifications,
    unreadCount,
    markNotificationAsRead,
    markAllAsRead,
    clearNotifications,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};
