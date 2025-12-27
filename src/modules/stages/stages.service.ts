import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class StagesService {
  constructor(private prisma: PrismaService) {}

  async create(projectId: string, name: string, order: number = 0) {
    return this.prisma.projectStage.create({
      data: { projectId, name, order }
    });
  }

  async findByProject(projectId: string) {
    return this.prisma.projectStage.findMany({
      where: { projectId },
      include: {
        tasks: {
          include: {
            subtasks: true
          }
        }
      },
      orderBy: { order: 'asc' }
    });
  }

  async update(stageId: string, data: { name?: string; order?: number }) {
    return this.prisma.projectStage.update({
      where: { id: stageId },
      data
    });
  }

  async delete(stageId: string) {
    return this.prisma.projectStage.delete({
      where: { id: stageId }
    });
  }
}
