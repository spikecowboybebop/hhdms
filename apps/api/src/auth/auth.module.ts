import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { PrismaModule } from '../prisma/prisma.module'; // Points to your global prisma module definition

@Module({
  imports: [
    PrismaModule, // Direct structural access to global prisma wrapper engine instances
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'fallback_secret_key_anchor',
      signOptions: {
        expiresIn: (process.env.JWT_EXPIRATION || '8h') as unknown as number,
      },
    }),
  ],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}
