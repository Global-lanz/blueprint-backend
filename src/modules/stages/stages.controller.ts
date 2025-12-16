import { Body, Controller, Get, Param, Post, Put, Delete, UseGuards } from '@nestjs/common';
import { StagesService } from './stages.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('stages')
export class StagesController {
  constructor(private stagesService: StagesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() body: { projectId: string; name: string; order?: number }) {
    return this.stagesService.create(body.projectId, body.name, body.order);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: { name?: string; order?: number }) {
    return this.stagesService.update(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.stagesService.delete(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('project/:projectId')
  async byProject(@Param('projectId') projectId: string) {
    return this.stagesService.findByProject(projectId);
  }
}
