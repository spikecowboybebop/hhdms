// apps/api/src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { MobileSignupDto } from './dto/mobile-signup.dto'; // Imported your new validation DTO
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK) // Force return structural state token at code HTTP 200 instead of 201
  async login(@Body() loginDto: LoginDto) {
    return this.authService.validateAndLogin(loginDto);
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Request() req: { user: { sub: string; email: string; role: string } },
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(req.user.sub, changePasswordDto);
  }

  @Post('mobile_signup')
  @HttpCode(HttpStatus.CREATED) // Explicitly returns HTTP 201 Created on registration success
  async mobileSignup(@Body() mobileSignupDto: MobileSignupDto) {
    return this.authService.mobileSignup(mobileSignupDto);
  }
}
