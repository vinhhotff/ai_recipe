import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AppWebSocketGateway } from './websocket.gateway';
import { WebSocketService } from './websocket.service';

@Module({
  imports: [
    JwtModule.register({
      // JWT config will be inherited from main app module
      secret: process.env.JWT_SECRET || 'fallback-secret',
      signOptions: { expiresIn: '1d' },
    }),
  ],
  providers: [AppWebSocketGateway, WebSocketService],
  exports: [AppWebSocketGateway, WebSocketService], // Export so other modules can use them
})
export class WebSocketModule {}
