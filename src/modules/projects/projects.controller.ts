import { Body, Controller, Get, Post, Put, Patch, Param, UseGuards, Req, Delete } from '@nestjs/common';
import { ProjectsService } from './projects.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WebhookGuard } from '../auth/webhook.guard';

@Controller('projects')
export class ProjectsController {
  constructor(private service: ProjectsService) {}

  @UseGuards(JwtAuthGuard)
  @Get()
  async getAll(@Req() req) {
    return this.service.findAllWithTasks(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('my')
  async myProjects(@Req() req) {
    return this.service.findByUser(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getById(@Param('id') id: string, @Req() req) {
    return this.service.findById(id, req.user.id);
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
  @Patch(':id/details')
  async updateDetails(@Param('id') id: string, @Body() body: {
    name?: string;
    status?: string;
    price?: string;
    currency?: string;
    saleStartDate?: string;
    links?: any;
  }, @Req() req) {
    const details: any = {};
    if (body.name !== undefined) details.name = body.name;
    if (body.status !== undefined) details.status = body.status;
    if (body.price !== undefined) details.price = body.price;
    if (body.currency !== undefined) details.currency = body.currency;
    if (body.saleStartDate !== undefined) details.saleStartDate = body.saleStartDate ? new Date(body.saleStartDate) : null;
    if (body.links !== undefined) details.links = body.links;
    
    return this.service.updateProjectDetails(id, req.user.id, details);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/structure')
  async updateStructure(@Param('id') id: string, @Body() body: any, @Req() req) {
    return this.service.updateProjectStructure(id, body.stages, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':projectId/tasks/:taskId/toggle')
  async toggleTask(@Param('projectId') projectId: string, @Param('taskId') taskId: string, @Req() req) {
    return this.service.toggleTask(projectId, taskId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':projectId/tasks/:taskId/status')
  async updateTaskStatus(
    @Param('projectId') projectId: string, 
    @Param('taskId') taskId: string, 
    @Body() body: { status: string },
    @Req() req
  ) {
    return this.service.updateTaskStatus(projectId, taskId, body.status, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':projectId/subtasks/:subtaskId/toggle')
  async toggleSubtask(@Param('projectId') projectId: string, @Param('subtaskId') subtaskId: string, @Req() req) {
    return this.service.toggleSubtask(projectId, subtaskId, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':projectId/subtasks/:subtaskId/answer')
  async updateSubtaskAnswer(
    @Param('projectId') projectId: string, 
    @Param('subtaskId') subtaskId: string, 
    @Body() body: { answer: string },
    @Req() req
  ) {
    return this.service.updateSubtaskAnswer(projectId, subtaskId, body.answer, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':projectId/tasks/:taskId/link')
  async updateTaskLink(
    @Param('projectId') projectId: string, 
    @Param('taskId') taskId: string, 
    @Body() body: { link: string | null },
    @Req() req
  ) {
    return this.service.updateTaskLink(projectId, taskId, body.link, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':projectId/subtasks/:subtaskId/link')
  async updateSubtaskLink(
    @Param('projectId') projectId: string, 
    @Param('subtaskId') subtaskId: string, 
    @Body() body: { link: string | null },
    @Req() req
  ) {
    return this.service.updateSubtaskLink(projectId, subtaskId, body.link, req.user.id);
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

  // Protected webhook route for Hotmart/N8N integration
  @UseGuards(WebhookGuard)
  @Post('webhook/create-client')
  async createClientFromWebhook(@Body() body: {
    email: string;
    name: string;
    event: 'PURCHASE_COMPLETE' | 'PURCHASE_REFUNDED';
  }) {
    return this.service.handleHotmartWebhook(body);
  }
}
