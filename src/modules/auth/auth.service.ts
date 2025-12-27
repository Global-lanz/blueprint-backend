import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Role } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  async validateUser(email: string, pass: string) {
    console.log('Validating user:', email);
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.log('User not found:', email);
      throw new UnauthorizedException('Credenciais inválidas');
    }
    
    console.log('User found, comparing password...');
    const match = await bcrypt.compare(pass, user.password);
    console.log('Password match:', match);
    if (!match) {
      throw new UnauthorizedException('Credenciais inválidas');
    }
    
    // Check if user is active
    if (!user.isActive) {
      console.log('User is inactive:', email);
      throw new UnauthorizedException('Sua conta está desativada. Entre em contato com o administrador para reativar seu acesso.');
    }
    
    // Check if license has expired
    if (user.licenseExpiresAt && user.licenseExpiresAt < new Date()) {
      console.log('User license expired:', email);
      throw new UnauthorizedException('Sua licença expirou. Entre em contato com o administrador para renovar seu acesso.');
    }
    
    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    });
    
    const { password, ...result } = user;
    return result;
  }

  async login(user: any) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async register(data: { name: string; email: string; password: string; role?: Role }) {
    const hashed = await bcrypt.hash(data.password, 10);
    const user = await this.prisma.user.create({
      data: { name: data.name, email: data.email, password: hashed, role: data.role || Role.CLIENT },
    });
    const { password, ...rest } = user;
    return rest;
  }
}
