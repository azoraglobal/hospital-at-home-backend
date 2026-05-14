import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { PatientProfile } from './entities/patient-profile.entity';
import { FamilyMember } from './entities/family-member.entity';
import { MedicalHistory } from './entities/medical-history.entity';
import { Allergy } from './entities/allergy.entity';
import { Vaccination } from './entities/vaccination.entity';

import { CreatePatientProfileDto } from './dto/create-patient-profile.dto';
import { UpdatePatientProfileDto } from './dto/update.dto';
import {
  CreateFamilyMemberDto,
  CreateMedicalHistoryDto,
  CreateAllergyDto,
  CreateVaccinationDto,
} from './dto/sub-resources.dto';
import {
  UpdateFamilyMemberDto,
  UpdateMedicalHistoryDto,
  UpdateAllergyDto,
  UpdateVaccinationDto,
} from './dto/update.dto';

@Injectable()
export class PatientsService {
  constructor(
    @InjectRepository(PatientProfile)
    private readonly profileRepo: Repository<PatientProfile>,

    @InjectRepository(FamilyMember)
    private readonly familyRepo: Repository<FamilyMember>,

    @InjectRepository(MedicalHistory)
    private readonly medHistoryRepo: Repository<MedicalHistory>,

    @InjectRepository(Allergy)
    private readonly allergyRepo: Repository<Allergy>,

    @InjectRepository(Vaccination)
    private readonly vaccinationRepo: Repository<Vaccination>,
  ) {}

  // ─── Profile ──────────────────────────────────────────────────────────────

  async createProfile(userId: string, dto: CreatePatientProfileDto): Promise<PatientProfile> {
    const existing = await this.profileRepo.findOne({ where: { userId } });
    if (existing) {
      throw new ConflictException('Patient profile already exists for this user');
    }

    if (dto.cnic) {
      const cnicExists = await this.profileRepo.findOne({ where: { cnic: dto.cnic } });
      if (cnicExists) throw new ConflictException('CNIC already registered');
    }

    const profile = this.profileRepo.create({ ...dto, userId });
    return this.profileRepo.save(profile);
  }

  async getMyProfile(userId: string): Promise<PatientProfile> {
    const profile = await this.profileRepo.findOne({
      where: { userId },
      relations: ['familyMembers', 'medicalHistories', 'allergies', 'vaccinations'],
    });
    if (!profile) throw new NotFoundException('Patient profile not found');
    return profile;
  }

  async getProfileById(profileId: string): Promise<PatientProfile> {
    const profile = await this.profileRepo.findOne({
      where: { id: profileId },
      relations: ['familyMembers', 'medicalHistories', 'allergies', 'vaccinations'],
    });
    if (!profile) throw new NotFoundException('Patient profile not found');
    return profile;
  }

  async updateProfile(userId: string, dto: UpdatePatientProfileDto): Promise<PatientProfile> {
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Patient profile not found');

    if (dto.cnic && dto.cnic !== profile.cnic) {
      const cnicExists = await this.profileRepo.findOne({ where: { cnic: dto.cnic } });
      if (cnicExists) throw new ConflictException('CNIC already registered');
    }

    Object.assign(profile, dto);
    return this.profileRepo.save(profile);
  }

  async deactivateProfile(userId: string): Promise<{ message: string }> {
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Patient profile not found');
    profile.isActive = false;
    await this.profileRepo.save(profile);
    return { message: 'Profile deactivated successfully' };
  }

  async getAllProfiles(page = 1, limit = 20): Promise<{ data: PatientProfile[]; total: number }> {
    const [data, total] = await this.profileRepo.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
      order: { createdAt: 'DESC' },
    });
    return { data, total };
  }

  // ─── Helper ───────────────────────────────────────────────────────────────

  private async resolveProfile(userId: string): Promise<PatientProfile> {
    const profile = await this.profileRepo.findOne({ where: { userId } });
    if (!profile) throw new NotFoundException('Patient profile not found. Create your profile first.');
    return profile;
  }

  // ─── Family Members ────────────────────────────────────────────────────────

  async addFamilyMember(userId: string, dto: CreateFamilyMemberDto): Promise<FamilyMember> {
    const profile = await this.resolveProfile(userId);
    const member = this.familyRepo.create({ ...dto, patientProfileId: profile.id });
    return this.familyRepo.save(member);
  }

  async getFamilyMembers(userId: string): Promise<FamilyMember[]> {
    const profile = await this.resolveProfile(userId);
    return this.familyRepo.find({
      where: { patientProfileId: profile.id },
      order: { createdAt: 'DESC' },
    });
  }

  async updateFamilyMember(userId: string, memberId: string, dto: UpdateFamilyMemberDto): Promise<FamilyMember> {
    const profile = await this.resolveProfile(userId);
    const member = await this.familyRepo.findOne({
      where: { id: memberId, patientProfileId: profile.id },
    });
    if (!member) throw new NotFoundException('Family member not found');
    Object.assign(member, dto);
    return this.familyRepo.save(member);
  }

  async deleteFamilyMember(userId: string, memberId: string): Promise<{ message: string }> {
    const profile = await this.resolveProfile(userId);
    const member = await this.familyRepo.findOne({
      where: { id: memberId, patientProfileId: profile.id },
    });
    if (!member) throw new NotFoundException('Family member not found');
    await this.familyRepo.remove(member);
    return { message: 'Family member removed' };
  }

  // ─── Medical History ───────────────────────────────────────────────────────

  async addMedicalHistory(userId: string, dto: CreateMedicalHistoryDto): Promise<MedicalHistory> {
    const profile = await this.resolveProfile(userId);
    const record = this.medHistoryRepo.create({ ...dto, patientProfileId: profile.id });
    return this.medHistoryRepo.save(record);
  }

  async getMedicalHistories(userId: string): Promise<MedicalHistory[]> {
    const profile = await this.resolveProfile(userId);
    return this.medHistoryRepo.find({
      where: { patientProfileId: profile.id },
      order: { diagnosedDate: 'DESC' },
    });
  }

  async updateMedicalHistory(userId: string, recordId: string, dto: UpdateMedicalHistoryDto): Promise<MedicalHistory> {
    const profile = await this.resolveProfile(userId);
    const record = await this.medHistoryRepo.findOne({
      where: { id: recordId, patientProfileId: profile.id },
    });
    if (!record) throw new NotFoundException('Medical history record not found');
    Object.assign(record, dto);
    return this.medHistoryRepo.save(record);
  }

  async deleteMedicalHistory(userId: string, recordId: string): Promise<{ message: string }> {
    const profile = await this.resolveProfile(userId);
    const record = await this.medHistoryRepo.findOne({
      where: { id: recordId, patientProfileId: profile.id },
    });
    if (!record) throw new NotFoundException('Medical history record not found');
    await this.medHistoryRepo.remove(record);
    return { message: 'Medical history record removed' };
  }

  // ─── Allergies ─────────────────────────────────────────────────────────────

  async addAllergy(userId: string, dto: CreateAllergyDto): Promise<Allergy> {
    const profile = await this.resolveProfile(userId);
    const allergy = this.allergyRepo.create({ ...dto, patientProfileId: profile.id });
    return this.allergyRepo.save(allergy);
  }

  async getAllergies(userId: string): Promise<Allergy[]> {
    const profile = await this.resolveProfile(userId);
    return this.allergyRepo.find({
      where: { patientProfileId: profile.id },
      order: { severity: 'DESC' },
    });
  }

  async updateAllergy(userId: string, allergyId: string, dto: UpdateAllergyDto): Promise<Allergy> {
    const profile = await this.resolveProfile(userId);
    const allergy = await this.allergyRepo.findOne({
      where: { id: allergyId, patientProfileId: profile.id },
    });
    if (!allergy) throw new NotFoundException('Allergy not found');
    Object.assign(allergy, dto);
    return this.allergyRepo.save(allergy);
  }

  async deleteAllergy(userId: string, allergyId: string): Promise<{ message: string }> {
    const profile = await this.resolveProfile(userId);
    const allergy = await this.allergyRepo.findOne({
      where: { id: allergyId, patientProfileId: profile.id },
    });
    if (!allergy) throw new NotFoundException('Allergy not found');
    await this.allergyRepo.remove(allergy);
    return { message: 'Allergy removed' };
  }

  // ─── Vaccinations ──────────────────────────────────────────────────────────

  async addVaccination(userId: string, dto: CreateVaccinationDto): Promise<Vaccination> {
    const profile = await this.resolveProfile(userId);
    const vacc = this.vaccinationRepo.create({ ...dto, patientProfileId: profile.id });
    return this.vaccinationRepo.save(vacc);
  }

  async getVaccinations(userId: string): Promise<Vaccination[]> {
    const profile = await this.resolveProfile(userId);
    return this.vaccinationRepo.find({
      where: { patientProfileId: profile.id },
      order: { administeredDate: 'DESC' },
    });
  }

  async updateVaccination(userId: string, vaccId: string, dto: UpdateVaccinationDto): Promise<Vaccination> {
    const profile = await this.resolveProfile(userId);
    const vacc = await this.vaccinationRepo.findOne({
      where: { id: vaccId, patientProfileId: profile.id },
    });
    if (!vacc) throw new NotFoundException('Vaccination record not found');
    Object.assign(vacc, dto);
    return this.vaccinationRepo.save(vacc);
  }

  async deleteVaccination(userId: string, vaccId: string): Promise<{ message: string }> {
    const profile = await this.resolveProfile(userId);
    const vacc = await this.vaccinationRepo.findOne({
      where: { id: vaccId, patientProfileId: profile.id },
    });
    if (!vacc) throw new NotFoundException('Vaccination record not found');
    await this.vaccinationRepo.remove(vacc);
    return { message: 'Vaccination record removed' };
  }
}