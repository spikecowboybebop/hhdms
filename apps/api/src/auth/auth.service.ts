// apps/api/src/auth/auth.service.ts
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
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
        id: user.id,
        email: user.email,
        first_name_en: user.firstNameEn,
        role: user.role.name,
      },
      require_password_change: user.passwordChangedAt === null,
    };
  }

  /**
   * Force-change the password for accounts still on a temporary password.
   * Requires the current password and writes passwordChangedAt so the
   * "change on first login" prompt is cleared.
   */
  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true, passwordChangedAt: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password credentials.');
    }

    const isCurrentPasswordMatching = await bcrypt.compare(
      dto.current_password,
      user.passwordHash,
    );
    if (!isCurrentPasswordMatching) {
      throw new UnauthorizedException(
        'Current password is incorrect. Please try again.',
      );
    }

    const isSameAsCurrent = await bcrypt.compare(
      dto.new_password,
      user.passwordHash,
    );
    if (isSameAsCurrent) {
      throw new ConflictException(
        'New password must be different from the current password.',
      );
    }

    const hashedPassword = await bcrypt.hash(dto.new_password, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: hashedPassword,
        passwordChangedAt: new Date(),
      },
    });

    return {
      message: 'Password updated successfully.',
      require_password_change: false,
    };
  }

  /**
   * Native Mobile Signup specifically for Mobile Users (Hardcoded role_id: 7)
   */
  /**
   * Native Mobile Signup specifically for Mobile Users (Hardcoded role_id: 7)
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
    const newMobileUser = await this.prisma.user.create({
      data: {
        email,
        passwordHash: hashedPassword, // Maps to password_hash
        phoneNumber: phone_number, // Maps to phone_number
        firstNameEn: first_name_en, // Maps to first_name_en
        lastNameEn: last_name_en, // Maps to last_name_en
        roleId: 7, // Mobile User roleId statically assigned
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

    const normalized = phone_number.startsWith('+880')
      ? phone_number
      : `+880${phone_number.replace(/^0+/, '')}`;
    const alternate = phone_number.startsWith('+880')
      ? `0${phone_number.slice(3)}`
      : phone_number;

    let linkedPatientId: string | null = null;

    const matchedPatient = await this.prisma.patients.findFirst({
      where: {
        OR: [
          { phone_number },
          { phone_number: normalized },
          { phone_number: alternate },
        ],
      },
    });
    if (matchedPatient) {
      await this.prisma.patients.update({
        where: { id: matchedPatient.id },
        data: { user_id: newMobileUser.id },
      });
      linkedPatientId = matchedPatient.id;
    } else {
      const mrn = `MRN-${Date.now()}-${String(Math.random()).slice(2, 8)}`;
      const newPatient = await this.prisma.patients.create({
        data: {
          mrn,
          first_name_en,
          last_name_en,
          phone_number,
          email,
          sex: 'U',
          user_id: newMobileUser.id,
          booked_by: null,
        },
      });
      linkedPatientId = newPatient.id;
    }

    const jwtPayload = {
      sub: newMobileUser.id,
      email: newMobileUser.email,
      role: 'MOBILE_USER',
    };
    const accessToken = await this.jwtService.signAsync(jwtPayload);

    return {
      message: 'Mobile user registration completed successfully.',
      userId: newMobileUser.id,
      patientId: linkedPatientId,
      access_token: accessToken,
    };
  }
}
