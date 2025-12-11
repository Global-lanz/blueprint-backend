import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class StagesService {
  constructor(private prisma: PrismaService) {}

  async create(projectId: string, name: string) {
    return this.prisma.stage.create({ data: { projectId, name } });
  }

  async addValue(stageId: string, content: string) {
    return this.prisma.stageValue.create({ data: { stageId, content } });
  }

  async findByProject(projectId: string) {
    return this.prisma.stage.findMany({ where: { projectId }, include: { values: true } });
  }
}
