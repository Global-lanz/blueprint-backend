import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

export enum AuditAction {
  USER_CREATED = 'USER_CREATED',
  USER_UPDATED = 'USER_UPDATED',
  USER_ACTIVATED = 'USER_ACTIVATED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  USER_DELETED = 'USER_DELETED',
  PASSWORD_CHANGED = 'PASSWORD_CHANGED',
  LICENSE_EXTENDED = 'LICENSE_EXTENDED',
  LICENSE_EXPIRED = 'LICENSE_EXPIRED',
  ROLE_CHANGED = 'ROLE_CHANGED',
}

export enum AuditSource {
  ADMIN_PANEL = 'ADMIN_PANEL',
  WEBHOOK = 'WEBHOOK',
  SYSTEM = 'SYSTEM',
  SELF = 'SELF',
}

interface AuditDetails {
  field?: string;
  oldValue?: any;
  newValue?: any;
  [key: string]: any;
}

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async logAction(
    userId: string,
    action: AuditAction,
    source: AuditSource,
    performedBy?: string,
    details?: AuditDetails,
    ipAddress?: string,
  ) {
    try {
      await this.prisma.userAuditLog.create({
        data: {
          userId,
          action,
          source,
          performedBy,
          details: details ? JSON.stringify(details) : null,
          ipAddress,
        },
      });
    } catch (error) {
      console.error('Error logging audit action:', error);
      // Não lançar erro para não interromper o fluxo principal
    }
  }

  async getUserAuditLog(userId: string, limit = 50) {
    const logs = await this.prisma.userAuditLog.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    // Parse JSON details
    return logs.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
    }));
  }

  async getRecentAuditLogs(limit = 100) {
    const logs = await this.prisma.userAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return logs.map(log => ({
      ...log,
      details: log.details ? JSON.parse(log.details) : null,
    }));
  }
}
