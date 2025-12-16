import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async createProject(userId: string, templateId: string, name: string) {
    // Buscar o template com todas as etapas, tarefas e subtarefas
    const template = await this.prisma.template.findUnique({
      where: { id: templateId },
      include: {
        stages: {
          include: {
            tasks: {
              include: {
                subtasks: true
              },
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { order: 'asc' }
        },
        tasks: {
          where: { stageId: null }, // Tasks sem stage (legacy)
          include: {
            subtasks: true
          }
        }
      }
    });

    if (!template) {
      throw new Error('Template não encontrado');
    }

    // Criar o projeto primeiro
    const project = await this.prisma.clientProject.create({
      data: {
        name,
        userId,
        templateId,
        templateVersion: template.version
      }
    });

    // Criar stages com tasks
    for (const stage of template.stages) {
      await this.prisma.projectStage.create({
        data: {
          projectId: project.id,
          name: stage.name,
          order: stage.order,
          tasks: {
            create: stage.tasks.map(task => ({
              projectId: project.id,
              title: task.title,
              description: task.description,
              order: task.order,
              subtasks: {
                create: task.subtasks.map(subtask => ({
                  description: subtask.description
                }))
              }
            }))
          }
        }
      });
    }

    // Retornar projeto completo
    return this.prisma.clientProject.findUnique({
      where: { id: project.id },
      include: {
        projectStages: {
          include: {
            tasks: {
              include: {
                subtasks: true
              }
            }
          },
          orderBy: { order: 'asc' }
        }
      }
    });
  }

  async findByUser(userId: string) {
    return this.prisma.clientProject.findMany({
      where: { userId },
      include: {
        template: true,
        projectStages: {
          include: {
            tasks: {
              include: {
                subtasks: true
              }
            }
          },
          orderBy: { order: 'asc' }
        },
        projectTasks: {
          include: {
            subtasks: true
          }
        }
      }
    });
  }

  async deleteProject(projectId: string, userId: string) {
    // Verificar se o projeto pertence ao usuário
    const project = await this.prisma.clientProject.findFirst({
      where: { id: projectId, userId }
    });

    if (!project) {
      throw new Error('Projeto não encontrado ou você não tem permissão');
    }

    // Deletar o projeto (cascade vai deletar tasks e subtasks automaticamente)
    await this.prisma.clientProject.delete({
      where: { id: projectId }
    });

    return { success: true };
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
    const project = await this.prisma.clientProject.findUnique({
      where: { id: projectId },
      include: {
        projectStages: {
          include: {
            tasks: true
          }
        },
        projectTasks: true
      }
    });
    
    if (!project) return;
    
    // Calcular tasks de todas as stages + tasks diretas
    const allTasks = [
      ...project.projectTasks,
      ...project.projectStages.flatMap(stage => stage.tasks)
    ];
    
    const totalTasks = allTasks.length;
    const completedTasks = allTasks.filter(t => t.completed).length;
    const progress = totalTasks ? (completedTasks / totalTasks) * 100 : 0;
    
    await this.prisma.clientProject.update({
      where: { id: projectId },
      data: { progress }
    });
  }
  
  async createStage(projectId: string, name: string, order: number) {
    return this.prisma.projectStage.create({
      data: { projectId, name, order }
    });
  }
}
