import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { StagesService } from './stages.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('stages')
export class StagesController {
  constructor(private stagesService: StagesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() body) {
    // body: { projectId, name }
    return this.stagesService.create(body.projectId, body.name);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/value')
  async addValue(@Param('id') id: string, @Body() body) {
    // body: { content }
    return this.stagesService.addValue(id, body.content);
  }

  @UseGuards(JwtAuthGuard)
  @Get('project/:projectId')
  async byProj(@Param('projectId') projectId: string) {
    return this.stagesService.findByProject(projectId);
  }
}
