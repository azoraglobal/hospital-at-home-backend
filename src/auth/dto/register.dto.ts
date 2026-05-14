import { IsString, IsEnum, IsOptional, Matches, MinLength } from 'class-validator';
import { UserRole } from '../interfaces/jwt-payload.interface';

export class RegisterDto {
  @IsString()
  @Matches(/^\+92[0-9]{10}$/, {
    message: 'Phone must be a valid Pakistani number. Format: +923XXXXXXXXX',
  })
  phone: string;

  @IsString()
  @MinLength(2, { message: 'Full name must be at least 2 characters' })
  fullName: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsString()
  email?: string;

  @IsOptional()
  @IsString()
  cnic?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  pmcNumber?: string;

  @IsOptional()
  @IsString()
  vehicleNumber?: string;
}