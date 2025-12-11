import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async create(task: { title: string; description?: string; templateId: string }) {
    return this.prisma.task.create({ data: task });
  }

  async findByTemplate(templateId: string) {
    return this.prisma.task.findMany({ where: { templateId }, include: { subtasks: true } });
  }
}
