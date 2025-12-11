import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class SubtasksService {
  constructor(private prisma: PrismaService) {}

  async create(data: { description: string; taskId: string }) {
    return this.prisma.subtask.create({ data });
  }

  async findByTask(taskId: string) {
    return this.prisma.subtask.findMany({ where: { taskId } });
  }
}
