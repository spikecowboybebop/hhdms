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
