import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from '../../prisma.service';
import { AuditService } from './audit.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, PrismaService, AuditService],
  exports: [UsersService, AuditService],
})
export class UsersModule {}
