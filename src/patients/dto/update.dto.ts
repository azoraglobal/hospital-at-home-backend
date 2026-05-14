import { PartialType } from '@nestjs/swagger';
import { CreatePatientProfileDto } from './create-patient-profile.dto';
import {
  CreateFamilyMemberDto,
  CreateMedicalHistoryDto,
  CreateAllergyDto,
  CreateVaccinationDto,
} from './sub-resources.dto';

export class UpdatePatientProfileDto extends PartialType(CreatePatientProfileDto) {}
export class UpdateFamilyMemberDto extends PartialType(CreateFamilyMemberDto) {}
export class UpdateMedicalHistoryDto extends PartialType(CreateMedicalHistoryDto) {}
export class UpdateAllergyDto extends PartialType(CreateAllergyDto) {}
export class UpdateVaccinationDto extends PartialType(CreateVaccinationDto) {}