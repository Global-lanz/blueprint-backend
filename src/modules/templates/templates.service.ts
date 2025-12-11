import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  async createTemplate(data: any) {
    // data: { name, version, tasks: [{title, description, subtasks: [{description}]}] }
    const template = await this.prisma.template.create({
      data: {
        name: data.name,
        version: data.version || '1.0',
        tasks: {
          create: (data.tasks || []).map((t) => ({ title: t.title, description: t.description, subtasks: { create: (t.subtasks || []).map(s => ({ description: s.description })) } })),
        },
      },
      include: { tasks: { include: { subtasks: true } } },
    });
    return template;
  }

  async getAll() {
    return this.prisma.template.findMany({ include: { tasks: { include: { subtasks: true } } } });
  }

  async getById(id: string) {
    const tpl = await this.prisma.template.findUnique({ where: { id }, include: { tasks: { include: { subtasks: true } } } });
    if (!tpl) throw new NotFoundException('Template not found');
    return tpl;
  }

  async createVersion(id: string, body: any) {
    const existing = await this.prisma.template.findUnique({ where: { id }, include: { tasks: { include: { subtasks: true } } } });
    if (!existing) throw new NotFoundException('Template not found');
    const newTpl = await this.prisma.template.create({
      data: {
        name: body.name || existing.name,
        version: body.version || `${existing.version}-1`,
        tasks: {
          create: (body.tasks || existing.tasks || []).map((t) => ({ title: t.title, description: t.description, subtasks: { create: (t.subtasks || []).map(s => ({ description: s.description })) } })),
        },
      },
      include: { tasks: { include: { subtasks: true } } },
    });
    return newTpl;
  }
}
