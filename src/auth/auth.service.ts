import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  ConflictException,
  InternalServerErrorException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { OtpVerification } from '../otp/otp-verification.entity';
import { SendOtpDto } from './dto/send-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { RegisterDto } from './dto/register.dto';
import { UserRole } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(OtpVerification)
    private otpRepository: Repository<OtpVerification>,
  ) {}

  // ─── SEND OTP ────────────────────────────────────────────

  async sendOtp(dto: SendOtpDto): Promise<{ message: string }> {
    const { phone } = dto;

    // Rate limiting: max 3 OTPs per 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentOtps = await this.otpRepository
      .createQueryBuilder('otp')
      .where('otp.phone = :phone', { phone })
      .andWhere('otp.createdAt > :tenMinutesAgo', { tenMinutesAgo })
      .getCount();

    if (recentOtps >= 3) {
      throw new BadRequestException(
        'Too many OTP requests. Please wait 10 minutes.',
      );
    }

    // Generate 6-digit OTP
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 5);

    // Invalidate old OTPs for this phone
    await this.otpRepository
      .createQueryBuilder()
      .update(OtpVerification)
      .set({ isUsed: true })
      .where('phone = :phone AND isUsed = false', { phone })
      .execute();

    // Save new OTP
    await this.otpRepository.save({
      phone,
      otpCode,
      purpose: 'login',
      expiresAt,
      isUsed: false,
      attempts: 0,
    });

    // In development, just log it
    if (this.configService.get('NODE_ENV') !== 'production') {
      console.log(`\n=============================`);
      console.log(`OTP for ${phone}: ${otpCode}`);
      console.log(`=============================\n`);
    }

    return { message: 'OTP sent successfully' };
  }

  // ─── VERIFY OTP ──────────────────────────────────────────

  async verifyOtp(dto: VerifyOtpDto): Promise<{
    accessToken: string;
    refreshToken: string;
    isNewUser: boolean;
    user: Partial<User>;
  }> {
    const { phone, otp } = dto;

    const otpRecord = await this.otpRepository.findOne({
      where: { phone, otpCode: otp, isUsed: false },
      order: { createdAt: 'DESC' },
    });

    if (!otpRecord) {
      throw new UnauthorizedException('Invalid OTP. Please try again.');
    }

    if (new Date() > otpRecord.expiresAt) {
      throw new UnauthorizedException('OTP has expired. Please request a new one.');
    }

    // Mark OTP as used
    otpRecord.isUsed = true;
    await this.otpRepository.save(otpRecord);

    // Check if user exists
    let user = await this.userRepository.findOne({ where: { phone } });
    const isNewUser = !user;

    if (!isNewUser) {
      // Existing user — update last login
      user.lastLoginAt = new Date();
      user.isVerified = true;
      await this.userRepository.save(user);

      const tokens = await this.generateTokens(user);
      return { ...tokens, isNewUser: false, user: this.sanitizeUser(user) };
    }

    // New user — return temp token so they can register
    const tempToken = this.jwtService.sign(
      { phone, temp: true },
      {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: '15m',
      },
    );

    return {
      accessToken: tempToken,
      refreshToken: '',
      isNewUser: true,
      user: { phone },
    };
  }

  // ─── REGISTER ────────────────────────────────────────────

  async register(dto: RegisterDto): Promise<{
    accessToken: string;
    refreshToken: string;
    user: Partial<User>;
  }> {
    const { phone } = dto;

    // Check phone was recently verified (within 15 minutes)
    const recentVerified = await this.otpRepository.findOne({
      where: { phone, isUsed: true, purpose: 'login' },
      order: { createdAt: 'DESC' },
    });

    if (!recentVerified) {
      throw new UnauthorizedException('Please verify your phone number first.');
    }

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    if (recentVerified.createdAt < fifteenMinutesAgo) {
      throw new UnauthorizedException('Session expired. Please verify your phone again.');
    }

    // Check if already registered
    const existing = await this.userRepository.findOne({ where: { phone } });
    if (existing) {
      throw new ConflictException('An account with this phone number already exists.');
    }

    // Validate doctor must have PMC number
    if (dto.role === UserRole.DOCTOR && !dto.pmcNumber) {
      throw new BadRequestException('PMC license number is required for doctors.');
    }

    try {
      // Create the user
      const user = this.userRepository.create({
        phone,
        email: dto.email,
        role: dto.role,
        isActive: true,
        isVerified: true,
        lastLoginAt: new Date(),
      });

      const savedUser = await this.userRepository.save(user);
      const tokens = await this.generateTokens(savedUser);

      return { ...tokens, user: this.sanitizeUser(savedUser) };
    } catch (error) {
      throw new InternalServerErrorException('Registration failed. Please try again.');
    }
  }

  // ─── REFRESH TOKEN ────────────────────────────────────────

  async refreshToken(token: string): Promise<{ accessToken: string }> {
    try {
      const payload = this.jwtService.verify(token, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
      });

      const user = await this.userRepository.findOne({
        where: { id: payload.sub, isActive: true },
      });

      if (!user) throw new UnauthorizedException('User not found.');

      const accessToken = this.jwtService.sign(
        { sub: user.id, phone: user.phone, role: user.role },
        {
          secret: this.configService.get('JWT_SECRET'),
          expiresIn: this.configService.get('JWT_EXPIRES_IN', '7d'),
        },
      );

      return { accessToken };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token.');
    }
  }

  // ─── HELPERS ─────────────────────────────────────────────

  private async generateTokens(user: User) {
    const payload = { sub: user.id, phone: user.phone, role: user.role };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_SECRET'),
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '7d'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.configService.get('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get('JWT_REFRESH_EXPIRES_IN', '30d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private sanitizeUser(user: User): Partial<User> {
    const { passwordHash, ...safe } = user;
    return safe;
  }
}