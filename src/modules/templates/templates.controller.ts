import { Body, Controller, Get, Param, Post, Put, Patch, UseGuards, Query } from '@nestjs/common';
import { TemplatesService } from './templates.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';

@Controller('templates')
export class TemplatesController {
  constructor(private templatesService: TemplatesService) { }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  async create(@Body() body) {
    return this.templatesService.createTemplate(body);
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  async list(@Query('includeInactive') includeInactive?: string) {
    const showInactive = includeInactive === 'true';
    return this.templatesService.getAll(showInactive);
  }

  @Get('public/list')
  async listPublic() {
    // Lista apenas templates ativos sem autenticação (para configurações)
    return this.templatesService.getAllActive();
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
}
