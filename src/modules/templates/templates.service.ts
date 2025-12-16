import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class TemplatesService {
  constructor(private prisma: PrismaService) {}

  async createTemplate(data: any) {
    // Create template first
    const template = await this.prisma.template.create({
      data: {
        name: data.name,
        version: data.version || '1.0',
        description: data.description || null,
      }
    });

    // Create stages with tasks
    for (const [stageIndex, stage] of (data.stages || []).entries()) {
      await this.prisma.templateStage.create({
        data: {
          name: stage.name,
          description: stage.description || null,
          order: stageIndex,
          templateId: template.id,
          tasks: {
            create: (stage.tasks || []).map((t, taskIndex) => ({
              title: t.title,
              description: t.description,
              order: taskIndex,
              templateId: template.id,
              subtasks: {
                create: (t.subtasks || []).map(s => ({ description: s.description }))
              }
            }))
          }
        }
      });
    }

    // Create tasks without stages
    for (const [index, t] of (data.tasks || []).entries()) {
      await this.prisma.task.create({
        data: {
          title: t.title,
          description: t.description,
          order: index,
          templateId: template.id,
          subtasks: {
            create: (t.subtasks || []).map(s => ({ description: s.description }))
          }
        }
      });
    }

    // Return complete template
    return this.prisma.template.findUnique({
      where: { id: template.id },
      include: {
        stages: {
          include: {
            tasks: {
              include: { subtasks: true },
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { order: 'asc' }
        },
        tasks: {
          where: { stageId: null },
          include: { subtasks: true },
          orderBy: { order: 'asc' }
        }
      },
    });
  }

  async getAll() {
    return this.prisma.template.findMany({
      include: {
        stages: {
          include: {
            tasks: {
              include: {
                subtasks: true
              }
            }
          },
          orderBy: { order: 'asc' }
        },
        tasks: {
          where: { stageId: null },
          include: {
            subtasks: true
          }
        }
      }
    });
  }

  async getById(id: string) {
    const tpl = await this.prisma.template.findUnique({
      where: { id },
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
          where: { stageId: null },
          include: {
            subtasks: true
          }
        }
      }
    });
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

  async updateTemplate(id: string, data: any) {
    const existing = await this.prisma.template.findUnique({ 
      where: { id },
      include: {
        stages: {
          include: {
            tasks: {
              include: { subtasks: true }
            }
          }
        },
        tasks: {
          where: { stageId: null },
          include: { subtasks: true }
        }
      }
    });
    if (!existing) throw new NotFoundException('Template not found');
    
    // Update basic template info
    await this.prisma.template.update({
      where: { id },
      data: {
        name: data.name,
        version: data.version,
        description: data.description || null,
      }
    });
    
    // Get IDs from the incoming data
    const incomingStageIds = (data.stages || []).filter(s => s.id).map(s => s.id);
    const existingStageIds = existing.stages.map(s => s.id);
    
    // Delete stages that are no longer in the list
    const stagesToDelete = existingStageIds.filter(id => !incomingStageIds.includes(id));
    for (const stageId of stagesToDelete) {
      await this.prisma.templateStage.delete({ where: { id: stageId } });
    }
    
    // Process each stage (update or create)
    for (const [stageIndex, stage] of (data.stages || []).entries()) {
      if (stage.id) {
        // Update existing stage
        await this.prisma.templateStage.update({
          where: { id: stage.id },
          data: {
            name: stage.name,
            description: stage.description || null,
            order: stageIndex,
          }
        });
        
        // Get existing tasks for this stage
        const existingStage = existing.stages.find(s => s.id === stage.id);
        const existingTaskIds = existingStage?.tasks.map(t => t.id) || [];
        const incomingTaskIds = (stage.tasks || []).filter(t => t.id).map(t => t.id);
        
        // Delete tasks that are no longer in the list
        const tasksToDelete = existingTaskIds.filter(id => !incomingTaskIds.includes(id));
        for (const taskId of tasksToDelete) {
          await this.prisma.task.delete({ where: { id: taskId } });
        }
        
        // Process tasks
        for (const [taskIndex, task] of (stage.tasks || []).entries()) {
          if (task.id) {
            // Update existing task
            await this.prisma.task.update({
              where: { id: task.id },
              data: {
                title: task.title,
                description: task.description,
                order: taskIndex,
              }
            });
            
            // Get existing subtasks
            const existingTask = existingStage?.tasks.find(t => t.id === task.id);
            const existingSubtaskIds = existingTask?.subtasks.map(s => s.id) || [];
            const incomingSubtaskIds = (task.subtasks || []).filter(s => s.id).map(s => s.id);
            
            // Delete subtasks no longer in the list
            const subtasksToDelete = existingSubtaskIds.filter(id => !incomingSubtaskIds.includes(id));
            for (const subtaskId of subtasksToDelete) {
              await this.prisma.subtask.delete({ where: { id: subtaskId } });
            }
            
            // Process subtasks
            for (const subtask of (task.subtasks || [])) {
              if (subtask.id) {
                await this.prisma.subtask.update({
                  where: { id: subtask.id },
                  data: { description: subtask.description }
                });
              } else {
                await this.prisma.subtask.create({
                  data: {
                    description: subtask.description,
                    taskId: task.id
                  }
                });
              }
            }
          } else {
            // Create new task
            await this.prisma.task.create({
              data: {
                title: task.title,
                description: task.description,
                order: taskIndex,
                templateId: id,
                stageId: stage.id,
                subtasks: {
                  create: (task.subtasks || []).map(s => ({ description: s.description }))
                }
              }
            });
          }
        }
      } else {
        // Create new stage
        await this.prisma.templateStage.create({
          data: {
            name: stage.name,
            description: stage.description || null,
            order: stageIndex,
            templateId: id,
            tasks: {
              create: (stage.tasks || []).map((t, taskIndex) => ({
                title: t.title,
                description: t.description,
                order: taskIndex,
                templateId: id,
                subtasks: {
                  create: (t.subtasks || []).map(s => ({ description: s.description }))
                }
              }))
            }
          }
        });
      }
    }
    
    // Handle tasks without stages (legacy)
    const existingTaskIds = existing.tasks.filter(t => !t.stageId).map(t => t.id);
    const incomingTaskIds = (data.tasks || []).filter(t => t.id).map(t => t.id);
    
    const tasksToDelete = existingTaskIds.filter(id => !incomingTaskIds.includes(id));
    for (const taskId of tasksToDelete) {
      await this.prisma.task.delete({ where: { id: taskId } });
    }
    
    for (const [taskIndex, task] of (data.tasks || []).entries()) {
      if (task.id) {
        await this.prisma.task.update({
          where: { id: task.id },
          data: {
            title: task.title,
            description: task.description,
            order: taskIndex,
          }
        });
        
        const existingTask = existing.tasks.find(t => t.id === task.id);
        const existingSubtaskIds = existingTask?.subtasks.map(s => s.id) || [];
        const incomingSubtaskIds = (task.subtasks || []).filter(s => s.id).map(s => s.id);
        
        const subtasksToDelete = existingSubtaskIds.filter(id => !incomingSubtaskIds.includes(id));
        for (const subtaskId of subtasksToDelete) {
          await this.prisma.subtask.delete({ where: { id: subtaskId } });
        }
        
        for (const subtask of (task.subtasks || [])) {
          if (subtask.id) {
            await this.prisma.subtask.update({
              where: { id: subtask.id },
              data: { description: subtask.description }
            });
          } else {
            await this.prisma.subtask.create({
              data: {
                description: subtask.description,
                taskId: task.id
              }
            });
          }
        }
      } else {
        await this.prisma.task.create({
          data: {
            title: task.title,
            description: task.description,
            order: taskIndex,
            templateId: id,
            subtasks: {
              create: (task.subtasks || []).map(s => ({ description: s.description }))
            }
          }
        });
      }
    }
    
    // Return updated template
    return this.prisma.template.findUnique({
      where: { id },
      include: {
        stages: {
          include: {
            tasks: {
              include: { subtasks: true },
              orderBy: { order: 'asc' }
            }
          },
          orderBy: { order: 'asc' }
        },
        tasks: {
          where: { stageId: null },
          include: { subtasks: true },
          orderBy: { order: 'asc' }
        }
      },
    });
  }

  async toggleActive(id: string) {
    const existing = await this.prisma.template.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Template not found');
    
    const updated = await this.prisma.template.update({
      where: { id },
      data: { isActive: !existing.isActive },
      include: {
        stages: {
          include: {
            tasks: {
              include: { subtasks: true }
            }
          }
        },
        tasks: {
          where: { stageId: null },
          include: { subtasks: true }
        }
      }
    });
    return updated;
  }
}
