import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsArray,
  IsDateString,
  IsInt,
  IsUUID,
  ValidateNested,
  Min,
  Max,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SessionType } from '../entities/telemedicine-session.entity';
import {
  MedicineForm,
  MedicineFrequency,
  MedicineRoute,
} from '../entities/prescription-medicine.entity';
import { MessageType } from '../entities/consultation-chat-message.entity';

// ─── Session DTOs ─────────────────────────────────────────────────────────────

export class InitiateSessionDto {
  @IsUUID()
  bookingId: string;

  @IsEnum(SessionType)
  sessionType: SessionType;

  @IsOptional()
  @IsString()
  chiefComplaint?: string;

  @IsOptional()
  @IsBoolean()
  enableRecording?: boolean;
}

export class EndSessionDto {
  @IsOptional()
  @IsString()
  consultationNotes?: string;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  icdCodes?: string[];

  @IsOptional()
  @IsBoolean()
  followUpRequired?: boolean;

  @IsOptional()
  @IsDateString()
  followUpDate?: string;

  @IsOptional()
  @IsObject()
  vitals?: Record<string, any>;
}

export class UpdateSessionNotesDto {
  @IsString()
  consultationNotes: string;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  icdCodes?: string[];

  @IsOptional()
  @IsObject()
  vitals?: Record<string, any>;
}

export class CancelSessionDto {
  @IsString()
  reason: string;
}

export class SessionQueryDto {
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 20;
}

// ─── Prescription DTOs ────────────────────────────────────────────────────────

export class PrescriptionMedicineDto {
  @IsString()
  medicineName: string;

  @IsOptional()
  @IsString()
  genericName?: string;

  @IsOptional()
  @IsString()
  brandName?: string;

  @IsEnum(MedicineForm)
  form: MedicineForm;

  @IsString()
  strength: string;

  @IsEnum(MedicineFrequency)
  frequency: MedicineFrequency;

  @IsEnum(MedicineRoute)
  route: MedicineRoute;

  @IsString()
  duration: string;

  @IsOptional()
  @IsInt()
  durationDays?: number;

  @IsOptional()
  @IsString()
  dose?: string;

  @IsOptional()
  @IsInt()
  quantity?: number;

  @IsOptional()
  @IsString()
  instructions?: string;

  @IsOptional()
  @IsBoolean()
  isControlled?: boolean;
}

export class CreatePrescriptionDto {
  @IsUUID()
  sessionId: string;

  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  icdCodes?: string[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrescriptionMedicineDto)
  medicines: PrescriptionMedicineDto[];

  @IsOptional()
  @IsString()
  clinicalNotes?: string;

  @IsOptional()
  @IsString()
  specialInstructions?: string;

  @IsOptional()
  @IsString()
  labInvestigations?: string;

  @IsOptional()
  @IsString()
  radiologyInvestigations?: string;

  @IsOptional()
  @IsBoolean()
  followUpRequired?: boolean;

  @IsOptional()
  @IsDateString()
  followUpDate?: string;
}

export class UpdatePrescriptionDto {
  @IsOptional()
  @IsString()
  diagnosis?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  icdCodes?: string[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PrescriptionMedicineDto)
  medicines?: PrescriptionMedicineDto[];

  @IsOptional()
  @IsString()
  clinicalNotes?: string;

  @IsOptional()
  @IsString()
  specialInstructions?: string;

  @IsOptional()
  @IsString()
  labInvestigations?: string;

  @IsOptional()
  @IsString()
  radiologyInvestigations?: string;
}

// ─── Chat DTOs ────────────────────────────────────────────────────────────────

export class SendChatMessageDto {
  @IsUUID()
  sessionId: string;

  @IsEnum(MessageType)
  messageType: MessageType;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  fileUrl?: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsString()
  fileMimeType?: string;

  @IsOptional()
  @IsInt()
  fileSize?: number;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class ChatQueryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;

  @IsOptional()
  @IsString()
  before?: string;
}

// ─── Recording DTOs ───────────────────────────────────────────────────────────

export class StartRecordingDto {
  @IsUUID()
  sessionId: string;
}

export class StopRecordingDto {
  @IsUUID()
  sessionId: string;

  @IsString()
  resourceId: string;

  @IsString()
  sid: string;
}