import { Body, Controller, Get, Post, Param, UseGuards, Req, Delete } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('projects')
export class ProjectsController {
  constructor(private service: ProjectsService) {}

  @UseGuards(JwtAuthGuard)
  @Get('my')
  async myProjects(@Req() req) {
    return this.service.findByUser(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() body: { name: string; templateId: string }, @Req() req) {
    return this.service.createProject(req.user.id, body.templateId, body.name);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req) {
    return this.service.deleteProject(id, req.user.id);
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
