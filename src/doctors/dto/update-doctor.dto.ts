import { PartialType } from '@nestjs/mapped-types';
import { CreateDoctorDto } from './create-doctor.dto';
import {
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateDoctorDto extends PartialType(CreateDoctorDto) {}

export class SearchDoctorsDto {
  @IsString()
  @IsOptional()
  search?: string;

  @IsString()
  @IsOptional()
  specializationId?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  minFee?: number;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  @IsOptional()
  maxFee?: number;

  @IsBoolean()
  @IsOptional()
  acceptsHomeVisits?: boolean;

  @IsBoolean()
  @IsOptional()
  acceptsVideoCalls?: boolean;

  @IsBoolean()
  @IsOptional()
  isAvailableNow?: boolean;

  @IsNumber()
  @Min(1)
  @Max(5)
  @Type(() => Number)
  @IsOptional()
  minRating?: number;

  @IsString()
  @IsOptional()
  sortBy?: string;

  @IsNumber()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  page?: number;

  @IsNumber()
  @Min(1)
  @Max(50)
  @Type(() => Number)
  @IsOptional()
  limit?: number;
}