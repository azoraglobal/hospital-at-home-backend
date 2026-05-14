import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Doctor, DoctorStatus, PMDCVerificationStatus } from './entities/doctor.entity';
import { DoctorAvailability, DayOfWeek } from './entities/doctor-availability.entity';
import { DoctorDocument, DocumentType } from './entities/doctor-document.entity';
import { Specialization } from './entities/specialization.entity';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto, SearchDoctorsDto } from './dto/update-doctor.dto';
import { BulkSetAvailabilityDto, BlockDateDto } from './dto/availability.dto';
import { Appointment, AppointmentStatus } from '../appointments/entities/appointment.entity';

@Injectable()
export class DoctorsService {
  constructor(
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
    @InjectRepository(DoctorAvailability)
    private readonly availabilityRepo: Repository<DoctorAvailability>,
    @InjectRepository(DoctorDocument)
    private readonly documentRepo: Repository<DoctorDocument>,
    @InjectRepository(Specialization)
    private readonly specializationRepo: Repository<Specialization>,
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
  ) {}

  // ═══════════════════════════════════════════════
  //  DOCTOR PROFILE CRUD
  // ═══════════════════════════════════════════════

  async createProfile(userId: string, dto: CreateDoctorDto): Promise<Doctor> {
    const existing = await this.doctorRepo.findOne({ where: { userId } });
    if (existing) throw new ConflictException('Doctor profile already exists for this user');

    let specializations: Specialization[] = [];
    if (dto.specializationIds?.length) {
      specializations = await this.specializationRepo.findByIds(dto.specializationIds);
      if (specializations.length !== dto.specializationIds.length) {
        throw new BadRequestException('One or more specialization IDs are invalid');
      }
    }

    const doctor = this.doctorRepo.create({
      ...dto,
      userId,
      specializations,
      status: DoctorStatus.PENDING,
    });

    return this.doctorRepo.save(doctor);
  }

  async getMyProfile(userId: string): Promise<Doctor> {
    const doctor = await this.doctorRepo.findOne({
      where: { userId },
      relations: ['specializations', 'availability', 'documents'],
    });
    if (!doctor) throw new NotFoundException('Doctor profile not found');
    return doctor;
  }

  async getProfileById(id: string): Promise<Doctor> {
    const doctor = await this.doctorRepo.findOne({
      where: { id, status: DoctorStatus.ACTIVE },
      relations: ['specializations', 'availability'],
    });
    if (!doctor) throw new NotFoundException('Doctor not found');
    return doctor;
  }

  async updateProfile(userId: string, dto: UpdateDoctorDto): Promise<Doctor> {
    const doctor = await this.doctorRepo.findOne({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    if (dto.specializationIds) {
      const specializations = await this.specializationRepo.findByIds(dto.specializationIds);
      doctor.specializations = specializations;
    }

    if (dto.pmdcNumber && dto.pmdcNumber !== doctor.pmdcNumber) {
      doctor.pmdcVerificationStatus = PMDCVerificationStatus.UNVERIFIED;
      doctor.pmdcVerifiedAt = null;
    }

    Object.assign(doctor, dto);
    return this.doctorRepo.save(doctor);
  }

  async searchDoctors(query: SearchDoctorsDto) {
    const qb = this.doctorRepo
      .createQueryBuilder('d')
      .leftJoinAndSelect('d.specializations', 'spec')
      .where('d.status = :status', { status: DoctorStatus.ACTIVE });

    if (query.search) {
      qb.andWhere('(d.fullName ILIKE :q OR d.primarySpecialization ILIKE :q)', {
        q: `%${query.search}%`,
      });
    }
    if (query.specializationId) {
      qb.andWhere('spec.id = :specId', { specId: query.specializationId });
    }
    if (query.city) {
      qb.andWhere('d.city ILIKE :city', { city: `%${query.city}%` });
    }
    if (query.minFee !== undefined) {
      qb.andWhere('d.consultationFee >= :minFee', { minFee: query.minFee });
    }
    if (query.maxFee !== undefined) {
      qb.andWhere('d.consultationFee <= :maxFee', { maxFee: query.maxFee });
    }
    if (query.acceptsHomeVisits !== undefined) {
      qb.andWhere('d.acceptsHomeVisits = :hv', { hv: query.acceptsHomeVisits });
    }
    if (query.acceptsVideoCalls !== undefined) {
      qb.andWhere('d.acceptsVideoCalls = :vc', { vc: query.acceptsVideoCalls });
    }
    if (query.isAvailableNow) {
      qb.andWhere('d.isAvailableNow = true');
    }
    if (query.minRating) {
      qb.andWhere('d.averageRating >= :minRating', { minRating: query.minRating });
    }

    switch (query.sortBy) {
      case 'rating': qb.orderBy('d.averageRating', 'DESC'); break;
      case 'fee_asc': qb.orderBy('d.consultationFee', 'ASC'); break;
      case 'fee_desc': qb.orderBy('d.consultationFee', 'DESC'); break;
      case 'experience': qb.orderBy('d.yearsOfExperience', 'DESC'); break;
      case 'reviews': qb.orderBy('d.totalReviews', 'DESC'); break;
      default: qb.orderBy('d.averageRating', 'DESC');
    }

    const page = query.page || 1;
    const limit = query.limit || 10;
    qb.skip((page - 1) * limit).take(limit);

    const [data, total] = await qb.getManyAndCount();
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ═══════════════════════════════════════════════
  //  PMDC VERIFICATION
  // ═══════════════════════════════════════════════

  async submitPmdcVerification(userId: string, pmdcNumber: string): Promise<Doctor> {
    const doctor = await this.doctorRepo.findOne({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    if (doctor.pmdcVerificationStatus === PMDCVerificationStatus.VERIFIED) {
      throw new BadRequestException('PMDC already verified');
    }

    const conflict = await this.doctorRepo.findOne({
      where: { pmdcNumber, pmdcVerificationStatus: PMDCVerificationStatus.VERIFIED },
    });
    if (conflict && conflict.id !== doctor.id) {
      throw new ConflictException('This PMDC number is already registered');
    }

    doctor.pmdcNumber = pmdcNumber;
    doctor.pmdcVerificationStatus = PMDCVerificationStatus.PENDING;
    return this.doctorRepo.save(doctor);
  }

  async adminVerifyPmdc(doctorId: string, approved: boolean, reason?: string): Promise<Doctor> {
    const doctor = await this.doctorRepo.findOne({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    if (approved) {
      doctor.pmdcVerificationStatus = PMDCVerificationStatus.VERIFIED;
      doctor.pmdcVerifiedAt = new Date();
      doctor.pmdcRejectionReason = null;
      doctor.status = DoctorStatus.ACTIVE;
    } else {
      doctor.pmdcVerificationStatus = PMDCVerificationStatus.FAILED;
      doctor.pmdcRejectionReason = reason;
    }

    return this.doctorRepo.save(doctor);
  }

  // ═══════════════════════════════════════════════
  //  DOCUMENT UPLOAD
  // ═══════════════════════════════════════════════

  async addDocument(
    userId: string,
    documentType: DocumentType,
    fileUrl: string,
    originalName: string,
  ): Promise<DoctorDocument> {
    const doctor = await this.doctorRepo.findOne({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    const doc = this.documentRepo.create({
      doctorId: doctor.id,
      documentType,
      fileUrl,
      originalName,
    });
    return this.documentRepo.save(doc);
  }

  async getDoctorDocuments(doctorId: string): Promise<DoctorDocument[]> {
    return this.documentRepo.find({ where: { doctorId } });
  }

  // ═══════════════════════════════════════════════
  //  AVAILABILITY
  // ═══════════════════════════════════════════════

  async setAvailability(userId: string, dto: BulkSetAvailabilityDto): Promise<DoctorAvailability[]> {
    const doctor = await this.doctorRepo.findOne({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    const days = dto.slots.map((s) => s.dayOfWeek);
    const uniqueDays = new Set(days);
    if (days.length !== uniqueDays.size) {
      throw new BadRequestException('Duplicate days found. Use one slot per day.');
    }

    await this.availabilityRepo.delete({ doctorId: doctor.id, overrideDate: null });

    const slots = dto.slots.map((s) =>
      this.availabilityRepo.create({ ...s, doctorId: doctor.id }),
    );
    return this.availabilityRepo.save(slots);
  }

  async getMyAvailability(userId: string): Promise<DoctorAvailability[]> {
    const doctor = await this.doctorRepo.findOne({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');
    return this.availabilityRepo.find({
      where: { doctorId: doctor.id, isBlocked: false },
      order: { dayOfWeek: 'ASC' },
    });
  }

  async blockDate(userId: string, dto: BlockDateDto): Promise<DoctorAvailability> {
    const doctor = await this.doctorRepo.findOne({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    const block = this.availabilityRepo.create({
      doctorId: doctor.id,
      overrideDate: new Date(dto.date),
      isBlocked: true,
      blockReason: dto.blockReason,
      dayOfWeek: null,
      startTime: null,
      endTime: null,
    });
    return this.availabilityRepo.save(block);
  }

  async unblockDate(userId: string, date: string): Promise<void> {
    const doctor = await this.doctorRepo.findOne({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');
    await this.availabilityRepo.delete({
      doctorId: doctor.id,
      overrideDate: new Date(date),
      isBlocked: true,
    });
  }

  async getAvailableSlots(doctorId: string, date: string): Promise<string[]> {
    const doctor = await this.doctorRepo.findOne({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    const targetDate = new Date(date);
    const dayName = targetDate
      .toLocaleDateString('en-US', { weekday: 'long' })
      .toLowerCase() as DayOfWeek;

    const blocked = await this.availabilityRepo.findOne({
      where: { doctorId, overrideDate: targetDate, isBlocked: true },
    });
    if (blocked) return [];

    const avail = await this.availabilityRepo.findOne({
      where: { doctorId, dayOfWeek: dayName, isActive: true, isBlocked: false, overrideDate: null },
    });
    if (!avail) return [];

    const slots = this.generateTimeSlots(avail.startTime, avail.endTime, doctor.slotDurationMinutes);

    const booked = await this.appointmentRepo.find({
      where: { doctorId, appointmentDate: targetDate, status: AppointmentStatus.CONFIRMED },
      select: ['slotStartTime'],
    });
    const bookedTimes = new Set(booked.map((a) => a.slotStartTime));

    return slots.filter((s) => !bookedTimes.has(s));
  }

  private generateTimeSlots(start: string, end: string, durationMin: number): string[] {
    const slots: string[] = [];
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    let current = sh * 60 + sm;
    const endMin = eh * 60 + em;
    while (current + durationMin <= endMin) {
      const h = Math.floor(current / 60).toString().padStart(2, '0');
      const m = (current % 60).toString().padStart(2, '0');
      slots.push(`${h}:${m}`);
      current += durationMin;
    }
    return slots;
  }

  // ═══════════════════════════════════════════════
  //  ADMIN & OTHER
  // ═══════════════════════════════════════════════

  async adminUpdateStatus(doctorId: string, status: DoctorStatus): Promise<Doctor> {
    const doctor = await this.doctorRepo.findOne({ where: { id: doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');
    doctor.status = status;
    return this.doctorRepo.save(doctor);
  }

  async toggleAvailableNow(userId: string): Promise<{ isAvailableNow: boolean }> {
    const doctor = await this.doctorRepo.findOne({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');
    doctor.isAvailableNow = !doctor.isAvailableNow;
    await this.doctorRepo.save(doctor);
    return { isAvailableNow: doctor.isAvailableNow };
  }

  async getAllSpecializations(): Promise<Specialization[]> {
    return this.specializationRepo.find({ where: { isActive: true }, order: { name: 'ASC' } });
  }

  async createSpecialization(name: string, nameUrdu?: string, description?: string): Promise<Specialization> {
    const spec = this.specializationRepo.create({ name, nameUrdu, description });
    return this.specializationRepo.save(spec);
  }
}