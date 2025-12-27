import { Controller, Get, Param, UseGuards, Req, Post, Body, Put, Patch, Delete } from '@nestjs/common';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { UsersService } from './users.service';
import { AuditService } from './audit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AdminGuard } from '../auth/admin.guard';
import { Role } from '@prisma/client';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private usersService: UsersService,
    private auditService: AuditService,
  ) {}

  @Get()
  async getAll() {
    return this.usersService.findAll();
  }

  @Get(':id')
  async getOne(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  // Admin endpoints
  @UseGuards(AdminGuard)
  @Get('admin/all-with-stats')
  async getAllWithStats() {
    return this.usersService.getAllUsersWithStats();
  }

  @UseGuards(AdminGuard)
  @Post('admin/create')
  async createUser(
    @Req() req,
    @Body() body: {
      name: string;
      email: string;
      password: string;
      role: Role;
      licenseExpiresAt?: string;
    }
  ) {
    const data: any = {
      name: body.name,
      email: body.email,
      password: body.password,
      role: body.role
    };
    
    if (body.licenseExpiresAt) {
      data.licenseExpiresAt = new Date(body.licenseExpiresAt);
    }
    
    return this.usersService.createUser(data, req.user.userId);
  }

  @UseGuards(AdminGuard)
  @Put('admin/:id')
  async updateUser(
    @Req() req,
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      email?: string;
      password?: string;
      role?: Role;
      isActive?: boolean;
      licenseExpiresAt?: string | null;
    }
  ) {
    const data: any = {};
    
    if (body.name !== undefined) data.name = body.name;
    if (body.email !== undefined) data.email = body.email;
    if (body.password) data.password = body.password;
    if (body.role !== undefined) data.role = body.role;
    if (body.isActive !== undefined) data.isActive = body.isActive;
    if (body.licenseExpiresAt !== undefined) {
      data.licenseExpiresAt = body.licenseExpiresAt ? new Date(body.licenseExpiresAt) : null;
    }
    
    return this.usersService.updateUser(id, data, req.user.userId);
  }

  @UseGuards(AdminGuard)
  @Patch('admin/:id/toggle-access')
  async toggleAccess(
    @Req() req,
    @Param('id') id: string,
    @Body() body: { isActive: boolean }
  ) {
    return this.usersService.toggleUserAccess(id, body.isActive, req.user.userId);
  }

  @UseGuards(AdminGuard)
  @Delete('admin/:id')
  async deleteUser(@Req() req, @Param('id') id: string) {
    return this.usersService.deleteUser(id, req.user.userId);
  }

  // Audit endpoints
  @UseGuards(AdminGuard)
  @Get('admin/:id/audit-log')
  async getUserAuditLog(@Param('id') id: string) {
    return this.auditService.getUserAuditLog(id);
  }

  // Settings endpoints
  @UseGuards(AdminGuard)
  @Get('admin/settings/all')
  async getSettings() {
    return this.usersService.getSettings();
  }

  @UseGuards(AdminGuard)
  @Get('admin/settings/:key')
  async getSetting(@Param('key') key: string) {
    return this.usersService.getSetting(key);
  }

  @UseGuards(AdminGuard)
  @Put('admin/settings/:key')
  async upsertSetting(@Param('key') key: string, @Body() body: { value: string; description?: string }) {
    return this.usersService.upsertSetting(key, body.value, body.description);
  }
}

