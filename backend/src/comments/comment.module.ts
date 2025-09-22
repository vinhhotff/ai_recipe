import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { CommentService } from './comment.service';
import { CommentController, UserCommentController } from './comment.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AuthGuard } from '../common/guards/auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({}),
  ],
  controllers: [CommentController, UserCommentController],
  providers: [
    CommentService,
    AuthGuard,
    RolesGuard,
  ],
  exports: [CommentService],
})
export class CommentModule {}
