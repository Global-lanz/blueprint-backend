import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma.service';
import { AuditService, AuditAction, AuditSource } from './audit.service';

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async findAll() {
    return this.prisma.user.findMany({ select: { password: false, email: true, name: true, id: true, role: true } as any });
  }

  async findById(id: string) {
    return this.prisma.user.findUnique({ where: { id }, select: { password: false } as any });
  }

  async createClient(name: string, email: string, password: string) {
    const hashed = await import('bcrypt').then(m => m.hash(password, 10));
    const user = await this.prisma.user.create({ data: { name, email, password: hashed, role: Role.CLIENT } });
    const { password: _, ...rest } = user as any;
    return rest;
  }

  // Admin methods for user management
  async getAllUsersWithStats() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        licenseExpiresAt: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            projects: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return users.map(user => ({
      ...user,
      projectCount: user._count.projects
    }));
  }

  async createUser(data: {
    name: string;
    email: string;
    password: string;
    role: Role;
    licenseExpiresAt?: Date;
  }, performedBy?: string) {
    // Check if email already exists
    const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const bcrypt = await import('bcrypt');
    const hashed = await bcrypt.hash(data.password, 10);
    
    const user = await this.prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        password: hashed,
        role: data.role,
        licenseExpiresAt: data.licenseExpiresAt,
        isActive: true
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        licenseExpiresAt: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Log audit
    await this.auditService.logAction(
      user.id,
      AuditAction.USER_CREATED,
      performedBy ? AuditSource.ADMIN_PANEL : AuditSource.SYSTEM,
      performedBy,
      {
        email: data.email,
        role: data.role,
        licenseExpiresAt: data.licenseExpiresAt?.toISOString(),
      },
    );

    return user;
  }

  async updateUser(id: string, data: {
    name?: string;
    email?: string;
    password?: string;
    role?: Role;
    isActive?: boolean;
    licenseExpiresAt?: Date | null;
  }, performedBy?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // If email is being changed, check for conflicts
    if (data.email && data.email !== user.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: data.email } });
      if (existing) {
        throw new ConflictException('Email already in use');
      }
    }

    // Prepare update data
    const updateData: any = {};
    const auditDetails: any = {};
    
    if (data.name !== undefined && data.name !== user.name) {
      updateData.name = data.name;
      auditDetails.name = { old: user.name, new: data.name };
    }
    if (data.email !== undefined && data.email !== user.email) {
      updateData.email = data.email;
      auditDetails.email = { old: user.email, new: data.email };
    }
    if (data.role !== undefined && data.role !== user.role) {
      updateData.role = data.role;
      auditDetails.role = { old: user.role, new: data.role };
      // Log role change separately
      await this.auditService.logAction(
        id,
        AuditAction.ROLE_CHANGED,
        performedBy ? AuditSource.ADMIN_PANEL : AuditSource.SYSTEM,
        performedBy,
        { oldRole: user.role, newRole: data.role },
      );
    }
    if (data.isActive !== undefined && data.isActive !== user.isActive) {
      updateData.isActive = data.isActive;
      auditDetails.isActive = { old: user.isActive, new: data.isActive };
    }
    if (data.licenseExpiresAt !== undefined) {
      // Comparar datas normalizadas (sem considerar milissegundos)
      const oldDate = user.licenseExpiresAt ? new Date(user.licenseExpiresAt).toISOString().split('T')[0] : null;
      const newDate = data.licenseExpiresAt ? new Date(data.licenseExpiresAt).toISOString().split('T')[0] : null;
      
      // Só atualizar se realmente mudou
      if (oldDate !== newDate) {
        updateData.licenseExpiresAt = data.licenseExpiresAt;
        
        if (data.licenseExpiresAt) {
          auditDetails.licenseExpiresAt = {
            old: user.licenseExpiresAt?.toISOString(),
            new: data.licenseExpiresAt.toISOString(),
          };
          // Log license extension
          await this.auditService.logAction(
            id,
            AuditAction.LICENSE_EXTENDED,
            performedBy ? AuditSource.ADMIN_PANEL : AuditSource.SYSTEM,
            performedBy,
            {
              oldExpiration: user.licenseExpiresAt?.toISOString(),
              newExpiration: data.licenseExpiresAt.toISOString(),
            },
          );
        }
      }
    }

    // Hash password if provided and not empty
    if (data.password && data.password.trim()) {
      const bcrypt = await import('bcrypt');
      updateData.password = await bcrypt.hash(data.password, 10);
      // Log password change
      await this.auditService.logAction(
        id,
        AuditAction.PASSWORD_CHANGED,
        performedBy ? AuditSource.ADMIN_PANEL : AuditSource.SYSTEM,
        performedBy,
        { changedBy: performedBy ? 'admin' : 'system' },
      );
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        licenseExpiresAt: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Log general update if there were changes
    if (Object.keys(auditDetails).length > 0) {
      await this.auditService.logAction(
        id,
        AuditAction.USER_UPDATED,
        performedBy ? AuditSource.ADMIN_PANEL : AuditSource.SYSTEM,
        performedBy,
        auditDetails,
      );
    }

    return updated;
  }

  async toggleUserAccess(id: string, isActive: boolean, performedBy?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        licenseExpiresAt: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Log activation/deactivation
    await this.auditService.logAction(
      id,
      isActive ? AuditAction.USER_ACTIVATED : AuditAction.USER_DEACTIVATED,
      performedBy ? AuditSource.ADMIN_PANEL : AuditSource.SYSTEM,
      performedBy,
      { isActive },
    );

    return updated;
  }

  async deleteUser(id: string, performedBy?: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Log deletion before deleting
    await this.auditService.logAction(
      id,
      AuditAction.USER_DELETED,
      performedBy ? AuditSource.ADMIN_PANEL : AuditSource.SYSTEM,
      performedBy,
      { email: user.email, name: user.name },
    );

    // Delete user's projects first (cascade will handle stages, tasks, subtasks)
    await this.prisma.clientProject.deleteMany({ where: { userId: id } });

    // Now delete the user
    await this.prisma.user.delete({ where: { id } });
    return { message: 'User deleted successfully' };
  }

  async updateLastLogin(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() }
    });
  }

  // Settings management
  async getSettings() {
    return this.prisma.settings.findMany({
      orderBy: { key: 'asc' }
    });
  }

  async getSetting(key: string) {
    return this.prisma.settings.findUnique({ where: { key } });
  }

  async upsertSetting(key: string, value: string, description?: string) {
    return this.prisma.settings.upsert({
      where: { key },
      update: { value, description },
      create: { key, value, description }
    });
  }
}
