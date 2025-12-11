import { Body, Controller, Get, Post, Param, UseGuards } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('projects')
export class ProjectsController {
  constructor(private service: ProjectsService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() body) {
    // body: { userId, templateId }
    return this.service.createProject(body.userId, body.templateId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('user/:userId')
  async byUser(@Param('userId') userId: string) {
    return this.service.findByUser(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/task-answer')
  async answerTask(@Param('id') id: string, @Body() body) {
    return this.service.submitTaskAnswer(id, body.taskId, body.answer);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/subtask-answer')
  async answerSubtask(@Param('id') id: string, @Body() body) {
    return this.service.submitSubtaskAnswer(id, body.subtaskId, body.answer);
  }

  // public webhook route used by n8n to create client and project
  @Post('webhook/create-client')
  async createClientFromWebhook(@Body() body) {
    // Expect: { email, name, templateId }
    // In future: implement full logic, create user, create project, assign default template
    return { status: 'pending', hint: 'This route is a placeholder for n8n / Hotmart integration' };
  }
}
