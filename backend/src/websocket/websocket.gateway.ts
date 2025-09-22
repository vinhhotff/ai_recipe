import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  role?: string;
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class AppWebSocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('WebSocketGateway');
  private connectedClients = new Map<string, AuthenticatedSocket>();

  constructor(private jwtService: JwtService) {}

  afterInit(server: Server) {
    this.logger.log('🔌 WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket ) {
    try {
      // Get auth info from handshake
      const { userId, role } = client.handshake.auth || {};
      
      if (!userId) {
        this.logger.warn(`❌ Client ${client.id} connected without authentication`);
        client.disconnect();
        return;
      }

      // Store authenticated client info
      client.userId = userId;
      client.role = role;
      this.connectedClients.set(client.id, client);

      this.logger.log(`✅ User ${userId} (${role}) connected [${client.id}]`);

      // Join role-based rooms
      if (role === 'ADMIN') {
        await client.join('admin-room');
        this.logger.log(`🔑 Admin ${userId} joined admin room`);
      }

      // Send welcome notification
      setTimeout(() => {
        client.emit('notification', {
          id: Date.now().toString(),
          type: 'system_alert',
          title: 'WebSocket Connected',
          message: 'Real-time features are now active!',
          timestamp: new Date().toISOString(),
          read: false,
        });
      }, 1000);

      // Update connection count
      this.broadcastConnectionCount();
      
    } catch (error) {
      this.logger.error('Connection error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    const { userId } = client;
    this.connectedClients.delete(client.id);
    this.logger.log(`❌ User ${userId} disconnected [${client.id}]`);
    this.broadcastConnectionCount();
  }

  // Test message handler
  @SubscribeMessage('test-message')
  handleTestMessage(
    @MessageBody() data: { message: string; timestamp: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    this.logger.log(`📨 Test message from ${client.userId}: ${data.message}`);
    
    // Echo back with notification
    client.emit('notification', {
      id: Date.now().toString(),
      type: 'test',
      title: 'Test Response',
      message: `Echo: ${data.message}`,
      timestamp: new Date().toISOString(),
      read: false,
    });
  }

  // Simulate notification
  @SubscribeMessage('simulate-notification')
  handleSimulateNotification(
    @MessageBody() data: { type?: string; title?: string; message?: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    this.logger.log(`🔔 Simulating notification for ${client.userId}`);
    
    client.emit('notification', {
      id: Date.now().toString(),
      type: data.type || 'test',
      title: data.title || 'Test Notification',
      message: data.message || 'This is a test notification',
      timestamp: new Date().toISOString(),
      read: false,
    });
  }

  // Admin alert simulation
  @SubscribeMessage('simulate-admin-alert')
  handleSimulateAdminAlert(
    @MessageBody() data: { title?: string; message?: string; priority?: string },
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (client.role !== 'ADMIN') {
      client.emit('error', { message: 'Unauthorized: Admin only' });
      return;
    }

    this.logger.log(`🚨 Broadcasting admin alert from ${client.userId}`);
    
    this.server.to('admin-room').emit('admin-alert', {
      id: Date.now().toString(),
      type: 'system_alert',
      title: data.title || 'System Alert',
      message: data.message || 'System alert triggered',
      timestamp: new Date().toISOString(),
      read: false,
      priority: data.priority || 'medium',
    });
  }

  // Join admin room (explicit handler)
  @SubscribeMessage('join-admin-room')
  handleJoinAdminRoom(@ConnectedSocket() client: AuthenticatedSocket) {
    if (client.role === 'ADMIN') {
      client.join('admin-room');
      this.logger.log(`🔑 Admin ${client.userId} joined admin room via event`);
    } else {
      client.emit('error', { message: 'Unauthorized: Admin only' });
    }
  }

  // Broadcast methods for external use
  broadcastToAll(event: string, data) {
    this.server.emit(event, data);
    this.logger.log(`📡 Broadcast to all: ${event}`);
  }

  broadcastToAdmins(event: string, data) {
    this.server.to('admin-room').emit(event, data);
    this.logger.log(`👑 Broadcast to admins: ${event}`);
  }

  broadcastToUser(userId: string, event: string, data) {
    const userClients = Array.from(this.connectedClients.values())
      .filter(client => client.userId === userId);
    
    userClients.forEach(client => {
      client.emit(event, data);
    });
    
    this.logger.log(`👤 Broadcast to user ${userId}: ${event}`);
  }

  // Send notification to specific user
  sendNotificationToUser(userId: string, notification) {
    this.broadcastToUser(userId, 'notification', {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      read: false,
      ...notification,
    });
  }

  // Send system-wide notification
  sendSystemNotification(notification) {
    this.broadcastToAll('notification', {
      id: Date.now().toString(),
      type: 'system_alert',
      timestamp: new Date().toISOString(),
      read: false,
      ...notification,
    });
  }

  // Real-time dashboard updates (for admins)
  sendDashboardUpdate(metrics) {
    this.broadcastToAdmins('dashboard-metrics-update', {
      ...metrics,
      timestamp: new Date().toISOString(),
    });
  }

  // User activity updates
  sendUserActivity(activity) {
    this.broadcastToAdmins('user-activity', {
      ...activity,
      timestamp: new Date().toISOString(),
    });
  }

  // Connection count helper
  private broadcastConnectionCount() {
    const connectionCount = this.connectedClients.size;
    this.broadcastToAdmins('connection-count', { count: connectionCount });
  }

  // Get connection stats
  getConnectionStats() {
    const stats = {
      totalConnections: this.connectedClients.size,
      adminConnections: Array.from(this.connectedClients.values())
        .filter(client => client.role === 'ADMIN').length,
      userConnections: Array.from(this.connectedClients.values())
        .filter(client => client.role !== 'ADMIN').length,
    };
    
    return stats;
  }
}
