import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsNumber,
  Min,
  Max,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BloodGroup, Gender } from '../entities/patient-profile.entity';

export class CreatePatientProfileDto {
  @ApiProperty({ example: 'Ahmed Ali Khan' })
  @IsString()
  fullName: string;

  @ApiPropertyOptional({ example: '1990-05-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @ApiPropertyOptional({ enum: BloodGroup })
  @IsOptional()
  @IsEnum(BloodGroup)
  bloodGroup?: BloodGroup;

  @ApiPropertyOptional({ example: '36302-1234567-8' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{5}-\d{7}-\d{1}$/, { message: 'CNIC must follow XXXXX-XXXXXXX-X format' })
  cnic?: string;

  @ApiPropertyOptional({ example: '+923001234567' })
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyContactPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyContactRelation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 'Multan' })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  profilePictureUrl?: string;

  @ApiPropertyOptional({ example: 170.5 })
  @IsOptional()
  @IsNumber()
  @Min(30)
  @Max(300)
  height?: number;

  @ApiPropertyOptional({ example: 70.0 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(500)
  weight?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  occupation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  insuranceProvider?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  insurancePolicyNumber?: string;
}