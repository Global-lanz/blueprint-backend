import { Module } from '@nestjs/common';
import { StagesService } from './stages.service';
import { StagesController } from './stages.controller';
import { PrismaService } from '../../prisma.service';

@Module({
  controllers: [StagesController],
  providers: [StagesService, PrismaService],
})
export class StagesModule {}
