import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class WebhookGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const webhookToken = request.headers['x-webhook-token'];

    if (!webhookToken) {
      throw new UnauthorizedException('Webhook token is required');
    }

    // Get webhook token from settings
    const setting = await this.prisma.settings.findUnique({
      where: { key: 'webhook_secret_token' }
    });

    if (!setting || !setting.value) {
      throw new UnauthorizedException('Webhook token not configured');
    }

    if (webhookToken !== setting.value) {
      throw new UnauthorizedException('Invalid webhook token');
    }

    return true;
  }
}
