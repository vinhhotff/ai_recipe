import { Module } from '@nestjs/common';
import { PantryService } from './pantry.service';
import { PantryController } from './pantry.controller';

@Module({
  providers: [PantryService],
  controllers: [PantryController],
  exports: [PantryService],
})
export class PantryModule {}