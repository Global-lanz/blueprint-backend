import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, ExtractJwt } from 'passport-jwt';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private prisma: PrismaService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || 'super-secret-change-me',
    });
  }

  async validate(payload: any) {
    console.log('JWT Payload:', payload);
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) {
      console.log('User not found for id:', payload.sub);
      return null;
    }
    const { password, ...rest } = user;
    console.log('User validated:', rest.email);
    return rest;
  }
}
