import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { SubtasksService } from './subtasks.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('subtasks')
export class SubtasksController {
  constructor(private subtasksService: SubtasksService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() body) {
    return this.subtasksService.create(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('task/:taskId')
  async byTask(@Param('taskId') taskId: string) {
    return this.subtasksService.findByTask(taskId);
  }
}
