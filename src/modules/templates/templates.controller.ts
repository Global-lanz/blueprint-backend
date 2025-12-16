import { Body, Controller, Get, Param, Post, Put, Patch, UseGuards } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('templates')
export class TemplatesController {
  constructor(private templatesService: TemplatesService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any) {
    return this.templatesService.updateTemplate(id, body);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/toggle-active')
  async toggleActive(@Param('id') id: string) {
    return this.templatesService.toggleActive(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post(':id/version')
  async createVersion(@Param('id') id: string, @Body() body: any) {
    return this.templatesService.createVersion(id, body);
  }
}
