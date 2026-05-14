import {
  IsUUID,
  IsDateString,
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  Matches,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AppointmentType } from '../entities/appointment.entity';

export class BookAppointmentDto {
  @IsUUID()
  doctorId: string;

  @IsDateString()
  appointmentDate: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  slotStartTime: string;

  @IsEnum(AppointmentType)
  appointmentType: AppointmentType;

  @IsString()
  @IsOptional()
  chiefComplaint?: string;

  @IsString()
  @IsOptional()
  patientAddress?: string;

  @IsNumber()
  @IsOptional()
  patientLat?: number;

  @IsNumber()
  @IsOptional()
  patientLng?: number;
}

export class UpdateAppointmentStatusDto {
  @IsString()
  status: string;

  @IsString()
  @IsOptional()
  cancellationReason?: string;

  @IsString()
  @IsOptional()
  doctorNotes?: string;
}

export class RescheduleAppointmentDto {
  @IsDateString()
  newDate: string;

  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  newSlotStartTime: string;
}

export class AppointmentQueryDto {
  @IsString()
  @IsOptional()
  status?: string;

  @IsDateString()
  @IsOptional()
  fromDate?: string;

  @IsDateString()
  @IsOptional()
  toDate?: string;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}