import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('templates')
export class TemplatesController {
  constructor(private templatesService: TemplatesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Body() body) {
    return this.templatesService.createTemplate(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async list() {
    return this.templatesService.getAll();
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async get(@Param('id') id: string) {
    return this.templatesService.getById(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/version')
  async createVersion(@Param('id') id: string, @Body() body: any) {
    return this.templatesService.createVersion(id, body);
  }
}
