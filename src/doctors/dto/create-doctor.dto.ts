import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  IsUUID,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { Gender } from '../entities/doctor.entity';

export class CreateDoctorDto {
  @IsString()
  fullName: string;

  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @IsDateString()
  @IsOptional()
  dateOfBirth?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsString()
  @IsOptional()
  languages?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  pmdcNumber?: string;

  @IsString()
  @IsOptional()
  medicalDegree?: string;

  @IsString()
  @IsOptional()
  medicalCollege?: string;

  @IsNumber()
  @IsOptional()
  graduationYear?: number;

  @IsString()
  @IsOptional()
  additionalQualifications?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  yearsOfExperience?: number;

  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  specializationIds?: string[];

  @IsString()
  @IsOptional()
  primarySpecialization?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  consultationFee?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  followUpFee?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  homeVisitFee?: number;

  @IsBoolean()
  @IsOptional()
  acceptsHomeVisits?: boolean;

  @IsBoolean()
  @IsOptional()
  acceptsVideoCalls?: boolean;

  @IsNumber()
  @Min(15)
  @Max(120)
  @IsOptional()
  slotDurationMinutes?: number;
}