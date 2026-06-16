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
