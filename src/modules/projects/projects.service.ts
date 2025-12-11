import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async createProject(userId: string, templateId: string) {
    const project = await this.prisma.clientProject.create({ data: { userId, templateId } });
    return project;
  }

  async findByUser(userId: string) {
    return this.prisma.clientProject.findMany({ where: { userId }, include: { stages: true } });
  }

  async submitTaskAnswer(projectId: string, taskId: string, answer: string) {
    const res = await this.prisma.clientTaskAnswer.create({ data: { projectId, taskId, answer } });
    // Update project progress (simplified, full logic depends on counts)
    await this.recalculateProgress(projectId);
    return res;
  }

  async submitSubtaskAnswer(projectId: string, subtaskId: string, answer: string) {
    const res = await this.prisma.clientSubtaskAnswer.create({ data: { projectId, subtaskId, answer } });
    await this.recalculateProgress(projectId);
    return res;
  }

  async recalculateProgress(projectId: string) {
    const project = await this.prisma.clientProject.findUnique({ where: { id: projectId }, include: { template: { include: { tasks: { include: { subtasks: true } } } }, tasks: true, subtasks: true } });
    if (!project) return;
    const totalTasks = project.template.tasks.length;
    const taskAnswersCount = (project.tasks || []).length;
    const progress = totalTasks ? (taskAnswersCount / totalTasks) * 100 : 0;
    await this.prisma.clientProject.update({ where: { id: projectId }, data: { progress } });
  }
  
  async createStage(projectId: string, name: string) {
    return this.prisma.stage.create({ data: { projectId, name } });
  }
}
