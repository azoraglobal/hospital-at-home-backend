import {
  IsEnum,
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  Min,
  Max,
  Matches,
  IsDateString,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { DayOfWeek } from '../entities/doctor-availability.entity';

export class CreateAvailabilityDto {
  @IsEnum(DayOfWeek)
  dayOfWeek: DayOfWeek;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'startTime must be HH:MM format' })
  startTime: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, { message: 'endTime must be HH:MM format' })
  endTime: string;

  @IsNumber()
  @Min(1)
  @Max(50)
  @IsOptional()
  maxSlots?: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class BulkSetAvailabilityDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAvailabilityDto)
  slots: CreateAvailabilityDto[];
}

export class BlockDateDto {
  @IsDateString()
  date: string;

  @IsString()
  @IsOptional()
  blockReason?: string;
}

export class GetSlotsQueryDto {
  @IsDateString()
  date: string;
}