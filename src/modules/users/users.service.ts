import { Injectable } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

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
}
