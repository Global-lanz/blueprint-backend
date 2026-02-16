import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { AuditService, AuditAction, AuditSource } from '../users/audit.service';

@Injectable()
export class ProjectsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) { }

  async findAllWithTasks(userId: string) {
    const projects = await this.prisma.clientProject.findMany({
      where: { userId },
      include: {
        template: true,
        projectStages: {
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
        projectTasks: {
          where: { stageId: null },
          include: {
            subtasks: true
          },
          orderBy: { order: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Mapear para estrutura esperada pelo frontend (stages ao invés de projectStages)
    return projects.map(project => ({
      ...project,
      stages: project.projectStages.map(stage => ({
        ...stage,
        tasks: stage.tasks
      })),
      tasks: project.projectTasks
    }));
  }

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
        templateId
      }
    });

    // Criar stages com tasks
    for (const stage of template.stages) {
      await this.prisma.projectStage.create({
        data: {
          projectId: project.id,
          name: stage.name,
          description: stage.description,
          order: stage.order,
          gemType: stage.gemType || 'ESMERALDA',
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

  async findById(projectId: string, userId: string) {
    const project = await this.prisma.clientProject.findFirst({
      where: { id: projectId, userId },
      include: {
        template: true,
        projectStages: {
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
        projectTasks: {
          where: { stageId: null },
          include: {
            subtasks: true
          },
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!project) {
      throw new Error('Projeto não encontrado ou você não tem permissão');
    }

    return project;
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

  async updateProjectDetails(projectId: string, userId: string, details: {
    name?: string;
    status?: string;
    price?: string;
    currency?: string;
    saleStartDate?: Date;
    actualStartDate?: Date;
    links?: any;
  }) {
    // Verificar se o projeto pertence ao usuário
    const project = await this.prisma.clientProject.findFirst({
      where: { id: projectId, userId }
    });

    if (!project) {
      throw new Error('Projeto não encontrado ou você não tem permissão');
    }

    const updateData: any = {};
    if (details.name !== undefined) updateData.name = details.name;
    if (details.status !== undefined) updateData.status = details.status;
    if (details.price !== undefined) updateData.price = details.price;
    if (details.currency !== undefined) updateData.currency = details.currency;
    if (details.saleStartDate !== undefined) updateData.saleStartDate = details.saleStartDate;
    if (details.actualStartDate !== undefined) updateData.actualStartDate = details.actualStartDate;
    if (details.links !== undefined) updateData.links = details.links;

    // Atualizar detalhes do projeto
    return this.prisma.clientProject.update({
      where: { id: projectId },
      data: updateData
    });
  }

  async updateProjectStructure(projectId: string, stages: any[], userId: string) {
    // Verificar se o projeto pertence ao usuário
    const project = await this.prisma.clientProject.findFirst({
      where: { id: projectId, userId },
      include: {
        projectStages: {
          include: {
            tasks: {
              include: { subtasks: true }
            }
          }
        }
      }
    });

    if (!project) {
      throw new Error('Projeto não encontrado ou você não tem permissão');
    }

    // Identificar stages para deletar
    const incomingStageIds = (stages || []).filter(s => s.id).map(s => s.id);
    const stagesToDelete = project.projectStages.filter(s => !incomingStageIds.includes(s.id));

    for (const stageToDelete of stagesToDelete) {
      // Cascade deletará tasks e subtasks se configurado no Prisma, senão deletar manualmente
      await this.prisma.projectStage.delete({ where: { id: stageToDelete.id } });
    }

    // Para cada stage, atualizar/criar
    for (const [stageIndex, stage] of (stages || []).entries()) {
      let stageId = stage.id;

      if (stageId) {
        // Atualizar stage existente
        await this.prisma.projectStage.update({
          where: { id: stageId },
          data: {
            name: stage.name,
            order: stageIndex,
            description: stage.description,
            gemType: stage.gemType || 'ESMERALDA'
          }
        });
      } else {
        // Criar novo stage
        const newStage = await this.prisma.projectStage.create({
          data: {
            projectId: projectId,
            name: stage.name,
            order: stageIndex,
            description: stage.description,
            gemType: stage.gemType || 'ESMERALDA'
          }
        });
        stageId = newStage.id;
      }

      const existingStage = project.projectStages.find(s => s.id === stageId);
      const existingTaskIds = existingStage?.tasks.map(t => t.id) || [];
      const incomingTaskIds = (stage.tasks || []).filter(t => t.id).map(t => t.id);

      // Deletar tasks removidas
      const tasksToDelete = existingTaskIds.filter(id => !incomingTaskIds.includes(id));
      for (const taskId of tasksToDelete) {
        await this.prisma.projectTask.delete({ where: { id: taskId } });
      }

      // Processar tasks
      for (const [taskIndex, task] of (stage.tasks || []).entries()) {
        if (task.id) {
          // Atualizar task existente
          await this.prisma.projectTask.update({
            where: { id: task.id },
            data: {
              title: task.title,
              description: task.description,
              order: taskIndex,
              stageId: stageId // Garantir que está no stage certo
            }
          });

          // Gerenciar subtasks
          const existingTask = existingStage?.tasks.find(t => t.id === task.id);
          const existingSubtaskIds = existingTask?.subtasks.map(s => s.id) || [];
          const incomingSubtaskIds = (task.subtasks || []).filter(s => s.id).map(s => s.id);

          const subtasksToDelete = existingSubtaskIds.filter(id => !incomingSubtaskIds.includes(id));
          for (const subtaskId of subtasksToDelete) {
            await this.prisma.projectSubtask.delete({ where: { id: subtaskId } });
          }

          for (const subtask of (task.subtasks || [])) {
            if (subtask.id) {
              await this.prisma.projectSubtask.update({
                where: { id: subtask.id },
                data: { description: subtask.description }
              });
            } else {
              await this.prisma.projectSubtask.create({
                data: {
                  description: subtask.description,
                  taskId: task.id
                }
              });
            }
          }
        } else {
          // Criar nova task
          await this.prisma.projectTask.create({
            data: {
              title: task.title,
              description: task.description,
              order: taskIndex,
              projectId: projectId,
              stageId: stageId,
              subtasks: {
                create: (task.subtasks || []).map(s => ({ description: s.description }))
              }
            }
          });
        }
      }
    }

    // Recalcular progresso
    await this.recalculateProgress(projectId);

    // Retornar projeto atualizado
    return this.findById(projectId, userId);
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
            tasks: {
              include: {
                subtasks: true
              }
            }
          }
        },
        projectTasks: {
          include: {
            subtasks: true
          }
        }
      }
    });

    if (!project) return;

    // Calcular todas as subtarefas
    const allTasks = [
      ...project.projectTasks,
      ...project.projectStages.flatMap(stage => stage.tasks)
    ];

    const allSubtasks = allTasks.flatMap(task => task.subtasks);

    const totalSubtasks = allSubtasks.length;
    const completedSubtasks = allSubtasks.filter(s => s.completed).length;
    const progress = totalSubtasks ? (completedSubtasks / totalSubtasks) * 100 : 0;

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

  async toggleTask(projectId: string, taskId: string, userId: string) {
    // Verificar se o projeto pertence ao usuário
    const project = await this.prisma.clientProject.findFirst({
      where: { id: projectId, userId }
    });

    if (!project) {
      throw new Error('Projeto não encontrado ou você não tem permissão');
    }

    // Buscar a task
    const task = await this.prisma.projectTask.findUnique({
      where: { id: taskId }
    });

    if (!task || task.projectId !== projectId) {
      throw new Error('Tarefa não encontrada');
    }

    // Toggle completed
    const updated = await this.prisma.projectTask.update({
      where: { id: taskId },
      data: { completed: !task.completed }
    });

    // Recalcular progresso
    await this.recalculateProgress(projectId);

    return updated;
  }

  async updateTaskStatus(projectId: string, taskId: string, status: string, userId: string) {
    // Verificar se o projeto pertence ao usuário
    const project = await this.prisma.clientProject.findFirst({
      where: { id: projectId, userId }
    });

    if (!project) {
      throw new Error('Projeto não encontrado ou você não tem permissão');
    }

    // Buscar a task
    const task = await this.prisma.projectTask.findUnique({
      where: { id: taskId }
    });

    if (!task || task.projectId !== projectId) {
      throw new Error('Tarefa não encontrada');
    }

    // Validar status
    const validStatuses = ['TODO', 'IN_PROGRESS', 'DONE'];
    if (!validStatuses.includes(status)) {
      throw new Error('Status inválido');
    }

    // Determinar completed baseado no status
    const completed = status === 'DONE';

    // Atualizar status e completed
    const updated = await this.prisma.projectTask.update({
      where: { id: taskId },
      data: {
        status: status as any,
        completed: completed
      }
    });

    // Recalcular progresso
    await this.recalculateProgress(projectId);

    return updated;
  }

  async toggleSubtask(projectId: string, subtaskId: string, userId: string) {
    // Verificar se o projeto pertence ao usuário
    const project = await this.prisma.clientProject.findFirst({
      where: { id: projectId, userId }
    });

    if (!project) {
      throw new Error('Projeto não encontrado ou você não tem permissão');
    }

    // Guardar a insígnia atual antes da atualização
    const previousGem = project.currentGem;

    // Buscar a subtask
    const subtask = await this.prisma.projectSubtask.findUnique({
      where: { id: subtaskId },
      include: { task: true }
    });

    if (!subtask || subtask.task.projectId !== projectId) {
      throw new Error('Subtarefa não encontrada');
    }

    // Toggle completed
    const updated = await this.prisma.projectSubtask.update({
      where: { id: subtaskId },
      data: { completed: !subtask.completed }
    });

    // Verificar se todas as subtasks da task estão completas
    await this.checkAndCompleteTask(subtask.taskId);

    // Recalcular progresso
    await this.recalculateProgress(projectId);

    // Calcular e atualizar insígnia
    const gemChange = await this.updateCurrentGem(projectId);

    return {
      ...updated,
      gemChange: gemChange
    };
  }

  async updateSubtaskAnswer(projectId: string, subtaskId: string, answer: string, userId: string) {
    // Verificar se o projeto pertence ao usuário
    const project = await this.prisma.clientProject.findFirst({
      where: { id: projectId, userId }
    });

    if (!project) {
      throw new Error('Projeto não encontrado ou você não tem permissão');
    }

    // Buscar a subtask
    const subtask = await this.prisma.projectSubtask.findUnique({
      where: { id: subtaskId },
      include: { task: true }
    });

    if (!subtask || subtask.task.projectId !== projectId) {
      throw new Error('Subtarefa não encontrada');
    }

    // Atualizar resposta
    const updated = await this.prisma.projectSubtask.update({
      where: { id: subtaskId },
      data: { answer }
    });

    return updated;
  }

  async updateTaskLink(projectId: string, taskId: string, link: string | null, userId: string) {
    // Verificar se o projeto pertence ao usuário
    const project = await this.prisma.clientProject.findFirst({
      where: { id: projectId, userId }
    });

    if (!project) {
      throw new Error('Projeto não encontrado ou você não tem permissão');
    }

    // Buscar a task
    const task = await this.prisma.projectTask.findUnique({
      where: { id: taskId }
    });

    if (!task || task.projectId !== projectId) {
      throw new Error('Tarefa não encontrada');
    }

    // Atualizar link
    return this.prisma.projectTask.update({
      where: { id: taskId },
      data: { link }
    });
  }

  async updateSubtaskLink(projectId: string, subtaskId: string, link: string | null, userId: string) {
    // Verificar se o projeto pertence ao usuário
    const project = await this.prisma.clientProject.findFirst({
      where: { id: projectId, userId }
    });

    if (!project) {
      throw new Error('Projeto não encontrado ou você não tem permissão');
    }

    // Buscar a subtask
    const subtask = await this.prisma.projectSubtask.findUnique({
      where: { id: subtaskId },
      include: { task: true }
    });

    if (!subtask || subtask.task.projectId !== projectId) {
      throw new Error('Subtarefa não encontrada');
    }

    // Atualizar link
    return this.prisma.projectSubtask.update({
      where: { id: subtaskId },
      data: { link }
    });
  }

  async checkAndCompleteTask(taskId: string) {
    // Buscar task com todas as subtasks
    const task = await this.prisma.projectTask.findUnique({
      where: { id: taskId },
      include: { subtasks: true }
    });

    if (!task) return;

    // Se não tem subtasks, não faz nada
    if (task.subtasks.length === 0) return;

    // Verificar quantas subtasks estão completas
    const completedCount = task.subtasks.filter(s => s.completed).length;
    const totalCount = task.subtasks.length;
    const allCompleted = completedCount === totalCount;
    const someCompleted = completedCount > 0;

    // Determinar o novo status
    let newStatus = task.status;
    let newCompleted = task.completed;

    if (allCompleted) {
      // Todas as subtarefas completas -> tarefa DONE
      newStatus = 'DONE';
      newCompleted = true;
    } else if (someCompleted) {
      // Pelo menos uma subtarefa completa -> tarefa IN_PROGRESS (se ainda estava TODO)
      if (task.status === 'TODO') {
        newStatus = 'IN_PROGRESS';
      }
      newCompleted = false;
    } else {
      // Nenhuma subtarefa completa -> tarefa TODO
      newStatus = 'TODO';
      newCompleted = false;
    }

    // Atualizar task se necessário
    if (task.completed !== newCompleted || task.status !== newStatus) {
      await this.prisma.projectTask.update({
        where: { id: taskId },
        data: {
          completed: newCompleted,
          status: newStatus
        }
      });
    }
  }

  // Hotmart webhook handler
  async handleHotmartWebhook(data: {
    email: string;
    name: string;
    event: 'PURCHASE_COMPLETE' | 'PURCHASE_REFUNDED';
  }) {
    try {
      // Check if user already exists
      let user = await this.prisma.user.findUnique({
        where: { email: data.email }
      });

      if (data.event === 'PURCHASE_COMPLETE') {
        // Get default license duration from settings
        const licenseSetting = await this.prisma.settings.findUnique({
          where: { key: 'default_license_duration_days' }
        });
        const daysToAdd = licenseSetting ? parseInt(licenseSetting.value, 10) : 365;
        const licenseExpiresAt = new Date();
        licenseExpiresAt.setDate(licenseExpiresAt.getDate() + daysToAdd);

        if (!user) {
          // Create new user with random password (user should reset via email)
          const bcrypt = await import('bcrypt');
          const randomPassword = Math.random().toString(36).slice(-8);
          const hashedPassword = await bcrypt.hash(randomPassword, 10);

          user = await this.prisma.user.create({
            data: {
              name: data.name,
              email: data.email,
              password: hashedPassword,
              role: 'CLIENT',
              isActive: true,
              licenseExpiresAt
            }
          });

          // Log user creation via webhook
          await this.auditService.logAction(
            user.id,
            AuditAction.USER_CREATED,
            AuditSource.WEBHOOK,
            null,
            {
              email: data.email,
              event: 'PURCHASE_COMPLETE',
              licenseExpiresAt: licenseExpiresAt.toISOString(),
            },
          );

          // Create project from default template if configured (only for new users)
          const defaultTemplateSetting = await this.prisma.settings.findUnique({
            where: { key: 'default_template_id' }
          });

          if (defaultTemplateSetting && defaultTemplateSetting.value) {
            await this.createProject(user.id, defaultTemplateSetting.value, 'Meu Projeto');
          }

          // TODO: Send welcome email with password reset link
        } else {
          // User exists, reactivate and extend license
          const oldLicenseExpiresAt = user.licenseExpiresAt;
          const wasActive = user.isActive;

          user = await this.prisma.user.update({
            where: { id: user.id },
            data: {
              isActive: true,
              licenseExpiresAt
            }
          });

          // Log license extension
          await this.auditService.logAction(
            user.id,
            AuditAction.LICENSE_EXTENDED,
            AuditSource.WEBHOOK,
            null,
            {
              event: 'PURCHASE_COMPLETE',
              oldExpiration: oldLicenseExpiresAt?.toISOString(),
              newExpiration: licenseExpiresAt.toISOString(),
            },
          );

          // Log reactivation if user was inactive
          if (!wasActive) {
            await this.auditService.logAction(
              user.id,
              AuditAction.USER_ACTIVATED,
              AuditSource.WEBHOOK,
              null,
              { event: 'PURCHASE_COMPLETE' },
            );
          }
        }

        return {
          success: true,
          message: 'User created/updated and access granted',
          userId: user.id,
          licenseExpiresAt
        };
      } else if (data.event === 'PURCHASE_REFUNDED') {
        if (user) {
          // Deactivate user immediately
          await this.prisma.user.update({
            where: { id: user.id },
            data: { isActive: false }
          });

          // Log deactivation
          await this.auditService.logAction(
            user.id,
            AuditAction.USER_DEACTIVATED,
            AuditSource.WEBHOOK,
            null,
            { event: 'PURCHASE_REFUNDED' },
          );

          return {
            success: true,
            message: 'User access revoked due to refund',
            userId: user.id
          };
        } else {
          return {
            success: false,
            message: 'User not found for refund'
          };
        }
      }

      return {
        success: false,
        message: 'Unknown event type'
      };
    } catch (error) {
      console.error('Hotmart webhook error:', error);
      return {
        success: false,
        message: error.message
      };
    }
  }

  async updateCurrentGem(projectId: string) {
    // Buscar projeto com todas as etapas e tarefas
    const project = await this.prisma.clientProject.findUnique({
      where: { id: projectId },
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

    if (!project || !project.projectStages || project.projectStages.length === 0) {
      return null;
    }

    const previousGem = project.currentGem;
    let currentGem: any = null;
    let hasStartedWorking = false;

    // Percorrer etapas em ordem
    for (const stage of project.projectStages) {
      // Verificar se TODAS as tarefas da etapa estão completas
      const allTasksComplete = stage.tasks.every(task => {
        // Uma tarefa está completa se todas as suas subtarefas estão completas
        if (task.subtasks && task.subtasks.length > 0) {
          return task.subtasks.every(st => st.completed);
        }
        return task.completed;
      });

      // Verificar se o usuário começou a trabalhar nesta etapa (pelo menos uma subtarefa marcada)
      const hasStartedStage = stage.tasks.some(task => {
        if (task.subtasks && task.subtasks.length > 0) {
          return task.subtasks.some(st => st.completed);
        }
        return task.completed;
      });

      if (allTasksComplete) {
        // Etapa completa, usuário ganha essa insígnia
        currentGem = stage.gemType;
        hasStartedWorking = true;
      } else {
        // Se o usuário ainda não tem nenhuma insígnia e começou a trabalhar nesta etapa
        if (!currentGem && hasStartedStage) {
          currentGem = stage.gemType;
          hasStartedWorking = true;
        }
        // Primeira etapa incompleta, parar aqui
        break;
      }
    }

    // Atualizar a insígnia no projeto
    await this.prisma.clientProject.update({
      where: { id: projectId },
      data: { currentGem: currentGem || null }
    });

    // Retornar informações sobre mudança de insígnia
    if (previousGem !== currentGem) {
      return {
        changed: true,
        previousGem: previousGem,
        newGem: currentGem
      };
    }

    return {
      changed: false,
      previousGem: previousGem,
      newGem: currentGem
    };
  }
}
