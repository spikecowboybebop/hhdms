HHDMS Authentication Module Blueprint (Prisma Engine)
This document dictates the complete production-grade implementation of our single-pass, JWT-based Authentication engine. It operates inside the NestJS sub-workspace (apps/api) and utilizes Prisma ORM to query the core relation layers.

1. Environment Configuration (apps/api/.env)
Ensure the local configuration layer contains these specific keys. These values will be loaded via your prisma.config.ts wrapper and NestJS standard config providers:

DATABASE_URL="postgresql://hhdms_admin:12345@localhost:5432/hhdms_db?schema=public"
JWT_SECRET="super_secure_hhdms_secret_key_2026_production"
JWT_EXPIRATION="8h"
PORT=4000

2. Shared Data Contracts (DTOs & Signatures)
Create an input validation model to sanitize traffic boundary entries safely before passing data to controllers.

File: apps/api/src/auth/dto/login.dto.ts

import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail({}, { message: 'Please provide a valid corporate email configuration.' })
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6, { message: 'Security passwords must contain at least 6 characters.' })
  password!: string;
}

3. Core Business Validation Layer
This module implements the strict verification checks. It handles looking up records in the users table via Prisma, evaluates encrypted password hashes with bcrypt, joins relational data to retrieve role names, and signs the resulting JWT.

File: apps/api/src/auth/auth.service.ts

import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async validateAndLogin(loginDto: LoginDto) {
    const { email, password } = loginDto;

    // 1. Fetch user record along with its matching relation mapping out of the roles table
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        role: true, // Auto-fetches joined profile mapping row
      },
    });

    // 2. Protect against username enumeration leaks by keeping the error messages completely identical
    if (!user) {
      throw new UnauthorizedException('Invalid email or password credentials.');
    }

    // 3. Evaluate the password hash using bcrypt
    const isPasswordMatching = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordMatching) {
      throw new UnauthorizedException('Invalid email or password credentials.');
    }

    // 4. Confirm the profile status layer is completely unrestricted
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('This account profile has been locked out or suspended.');
    }

    // 5. Structure the payload to store session information
    const jwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role.name, // Injects the true explicit string name (e.g., MBBS_DOCTOR)
    };

    // 6. Generate the signed bearer token asset string
    const accessToken = await this.jwtService.signAsync(jwtPayload);

    // 7. Satisfy response structural properties contract
    return {
      access_token: accessToken,
      user: {
        email: user.email,
        first_name_en: user.firstNameEn,
        role: user.role.name,
      },
    };
  }
}

4. Routing Interface Router Layer
Exposes the explicit endpoint pathway while serving as a guard to funnel sanitized data streams to the service layers.

File: apps/api/src/auth/auth.controller.ts

import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK) // Force return structural state token at code HTTP 200 instead of 201
  async login(@Body() loginDto: LoginDto) {
    return this.authService.validateAndLogin(loginDto);
  }
}

5. Unified Integration Module
Binds your independent files, passport initialization routines, and your local global PrismaModule layer into a single export container.

File: apps/api/src/auth/auth.module.ts

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
        expiresIn: process.env.JWT_EXPIRATION || '8h' 
      },
    }),
  ],
  providers: [AuthService],
  controllers: [AuthController],
  exports: [AuthService],
})
export class AuthModule {}

⚙️ Compilation Checklist
Before triggering the endpoint locally, make sure to add AuthModule to the main imports block inside your core root application tree module file (apps/api/src/app.module.ts):

import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuthModule],
})
export class AppModule {}




