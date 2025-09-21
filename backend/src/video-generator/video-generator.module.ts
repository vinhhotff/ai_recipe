import { Module } from '@nestjs/common';
import { VideoGeneratorController } from './video-generator.controller';
import { VideoGeneratorService } from './video-generator.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
  ],
  controllers: [VideoGeneratorController],
  providers: [
    VideoGeneratorService,
  ],
  exports: [
    VideoGeneratorService, // Export in case other modules need to access
  ],
})
export class VideoGeneratorModule {}
