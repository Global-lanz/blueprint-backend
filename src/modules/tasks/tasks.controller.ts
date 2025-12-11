import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('tasks')
export class TasksController {
  constructor(private tasksService: TasksService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() body) {
    return this.tasksService.create(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('template/:templateId')
  async byTemplate(@Param('templateId') templateId: string) {
    return this.tasksService.findByTemplate(templateId);
  }
}
