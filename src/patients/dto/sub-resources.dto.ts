import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BloodGroup, Gender } from '../entities/patient-profile.entity';
import { Relationship } from '../entities/family-member.entity';
import { ConditionType, ConditionStatus } from '../entities/medical-history.entity';
import { AllergyType, AllergySeverity, AllergyStatus } from '../entities/allergy.entity';
import { VaccinationStatus } from '../entities/vaccination.entity';

export class CreateFamilyMemberDto {
  @ApiProperty({ example: 'Fatima Khan' })
  @IsString()
  fullName: string;

  @ApiProperty({ enum: Relationship })
  @IsEnum(Relationship)
  relationship: Relationship;

  @ApiPropertyOptional()
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

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phoneNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cnic?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimaryContact?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  hasMedicalConditions?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  medicalNotes?: string;
}

export class CreateMedicalHistoryDto {
  @ApiProperty({ example: 'Type 2 Diabetes' })
  @IsString()
  conditionName: string;

  @ApiProperty({ enum: ConditionType })
  @IsEnum(ConditionType)
  conditionType: ConditionType;

  @ApiPropertyOptional({ enum: ConditionStatus })
  @IsOptional()
  @IsEnum(ConditionStatus)
  status?: ConditionStatus;

  @ApiPropertyOptional({ example: 'E11' })
  @IsOptional()
  @IsString()
  icdCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  diagnosedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  resolvedDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  treatingDoctor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  hospitalClinic?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isHereditary?: boolean;
}

export class CreateAllergyDto {
  @ApiProperty({ example: 'Penicillin' })
  @IsString()
  allergenName: string;

  @ApiProperty({ enum: AllergyType })
  @IsEnum(AllergyType)
  allergyType: AllergyType;

  @ApiProperty({ enum: AllergySeverity })
  @IsEnum(AllergySeverity)
  severity: AllergySeverity;

  @ApiPropertyOptional({ enum: AllergyStatus })
  @IsOptional()
  @IsEnum(AllergyStatus)
  status?: AllergyStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reactionDescription?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  onsetDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  diagnosedBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CreateVaccinationDto {
  @ApiProperty({ example: 'COVID-19' })
  @IsString()
  vaccineName: string;

  @ApiPropertyOptional({ example: 'Pfizer-BioNTech' })
  @IsOptional()
  @IsString()
  vaccineBrand?: string;

  @ApiPropertyOptional({ enum: VaccinationStatus })
  @IsOptional()
  @IsEnum(VaccinationStatus)
  status?: VaccinationStatus;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  doseNumber?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  totalDoses?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  administeredDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  nextDueDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  administeredBy?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  administeredAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  certificateUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}