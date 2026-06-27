// apps/api/src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { MobileSignupDto } from './dto/mobile-signup.dto'; // Import your signup DTO
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Centralized Login for all System Roles (Web & Mobile)
   */
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
    const isPasswordMatching = await bcrypt.compare(
      password,
      user.passwordHash,
    );
    if (!isPasswordMatching) {
      throw new UnauthorizedException('Invalid email or password credentials.');
    }

    // 4. Confirm the profile status layer is completely unrestricted
    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException(
        'This account profile has been locked out or suspended.',
      );
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

  /**
   * Native Mobile Signup specifically for Patients (Hardcoded role_id: 5)
   */
  /**
   * Native Mobile Signup specifically for Patients (Hardcoded role_id: 5)
   */
  async mobileSignup(mobileSignupDto: MobileSignupDto) {
    const { email, phone_number, password, first_name_en, last_name_en } =
      mobileSignupDto;

    // 1. Guard against duplicate records using an OR check on unique fields
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { email },
          { phoneNumber: phone_number }, // Matches Prisma's 'phoneNumber' property
        ],
      },
    });

    if (existingUser) {
      throw new ConflictException(
        'A user profile with this email address or phone number already exists.',
      );
    }

    // 2. Hash the plain text password from the mobile screen securely (Salt rounds: 10)
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 3. Insert record matching your exact internal Prisma model field casing (camelCase)
    const newPatient = await this.prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword, // Maps to password_hash
        phoneNumber: phone_number, // Maps to phone_number
        firstNameEn: first_name_en, // Maps to first_name_en
        lastNameEn: last_name_en, // Maps to last_name_en
        roleId: 5, // Patient roleId statically assigned
        status: 'ACTIVE', // Maps to AccountStatusEnum.ACTIVE
        mfaEnabled: false,
      },
      select: {
        id: true,
        email: true,
        phoneNumber: true,
        createdAt: true, // Adjusted to camelCase to match your Prisma model exactly
      },
    });

    return {
      message: 'Patient user registration completed successfully.',
      patientId: newPatient.id,
    };
  }
}
