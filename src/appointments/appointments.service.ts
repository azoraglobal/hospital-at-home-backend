import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  Appointment,
  AppointmentStatus,
  AppointmentType,
} from './entities/appointment.entity';
import {
  BookAppointmentDto,
  RescheduleAppointmentDto,
  AppointmentQueryDto,
} from './dto/appointment.dto';
import { DoctorsService } from '../doctors/doctors.service';
import { Doctor } from '../doctors/entities/doctor.entity';

@Injectable()
export class AppointmentsService {
  constructor(
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
    private readonly doctorsService: DoctorsService,
  ) {}

  async book(patientId: string, dto: BookAppointmentDto): Promise<Appointment> {
    const doctor = await this.doctorRepo.findOne({ where: { id: dto.doctorId } });
    if (!doctor) throw new NotFoundException('Doctor not found');

    if (dto.appointmentType === AppointmentType.HOME_VISIT && !doctor.acceptsHomeVisits) {
      throw new BadRequestException('This doctor does not accept home visits');
    }
    if (dto.appointmentType === AppointmentType.VIDEO_CALL && !doctor.acceptsVideoCalls) {
      throw new BadRequestException('This doctor does not offer video consultations');
    }
    if (dto.appointmentType === AppointmentType.HOME_VISIT && !dto.patientAddress) {
      throw new BadRequestException('Patient address is required for home visits');
    }

    const availableSlots = await this.doctorsService.getAvailableSlots(
      dto.doctorId,
      dto.appointmentDate,
    );
    if (!availableSlots.includes(dto.slotStartTime)) {
      throw new ConflictException(
        `Slot ${dto.slotStartTime} is not available on ${dto.appointmentDate}`,
      );
    }

    const patientConflict = await this.appointmentRepo.findOne({
      where: {
        patientId,
        appointmentDate: new Date(dto.appointmentDate),
        slotStartTime: dto.slotStartTime,
        status: AppointmentStatus.CONFIRMED,
      },
    });
    if (patientConflict) {
      throw new ConflictException('You already have an appointment at this time');
    }

    const slotEndTime = this.addMinutes(dto.slotStartTime, doctor.slotDurationMinutes);
    const feeCharged =
      dto.appointmentType === AppointmentType.HOME_VISIT
        ? doctor.homeVisitFee || doctor.consultationFee
        : doctor.consultationFee;

    const appointment = this.appointmentRepo.create({
      ...dto,
      patientId,
      appointmentDate: new Date(dto.appointmentDate),
      slotEndTime,
      feeCharged,
      status: AppointmentStatus.PENDING,
      bookingReference: this.generateBookingRef(),
    });

    const saved = await this.appointmentRepo.save(appointment);
    await this.doctorRepo.increment({ id: dto.doctorId }, 'totalAppointments', 1);
    return saved;
  }

  async getPatientAppointments(patientId: string, query: AppointmentQueryDto) {
    const qb = this.appointmentRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.doctor', 'doc')
      .leftJoinAndSelect('doc.specializations', 'spec')
      .where('a.patientId = :patientId', { patientId });

    this.applyCommonFilters(qb, query);
    const [data, total] = await qb.getManyAndCount();
    return this.paginate(data, total, query);
  }

  async getDoctorAppointments(userId: string, query: AppointmentQueryDto) {
    const doctor = await this.doctorRepo.findOne({ where: { userId } });
    if (!doctor) throw new NotFoundException('Doctor profile not found');

    const qb = this.appointmentRepo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.patient', 'patient')
      .where('a.doctorId = :doctorId', { doctorId: doctor.id });

    this.applyCommonFilters(qb, query);
    const [data, total] = await qb.getManyAndCount();
    return this.paginate(data, total, query);
  }

  async getAppointmentById(id: string, userId: string): Promise<Appointment> {
    const appt = await this.appointmentRepo.findOne({
      where: { id },
      relations: ['doctor', 'patient'],
    });
    if (!appt) throw new NotFoundException('Appointment not found');

    const doctor = await this.doctorRepo.findOne({ where: { userId } });
    const isPatient = appt.patientId === userId;
    const isDoctor = doctor && appt.doctorId === doctor.id;
    if (!isPatient && !isDoctor) throw new ForbiddenException('Access denied');

    return appt;
  }

  async confirmAppointment(appointmentId: string, doctorUserId: string): Promise<Appointment> {
    const { appt } = await this.getAppointmentAsDoctor(appointmentId, doctorUserId);
    if (appt.status !== AppointmentStatus.PENDING) {
      throw new BadRequestException('Only pending appointments can be confirmed');
    }
    appt.status = AppointmentStatus.CONFIRMED;
    appt.confirmedAt = new Date();
    return this.appointmentRepo.save(appt);
  }

  async cancelAppointment(
    appointmentId: string,
    userId: string,
    reason: string,
    role: 'patient' | 'doctor',
  ): Promise<Appointment> {
    const appt = await this.appointmentRepo.findOne({ where: { id: appointmentId } });
    if (!appt) throw new NotFoundException('Appointment not found');

    const cancellable = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED];
    if (!cancellable.includes(appt.status)) {
      throw new BadRequestException('This appointment cannot be cancelled');
    }

    appt.status =
      role === 'patient'
        ? AppointmentStatus.CANCELLED_BY_PATIENT
        : AppointmentStatus.CANCELLED_BY_DOCTOR;
    appt.cancellationReason = reason;
    return this.appointmentRepo.save(appt);
  }

  async completeAppointment(
    appointmentId: string,
    doctorUserId: string,
    notes?: string,
  ): Promise<Appointment> {
    const { appt } = await this.getAppointmentAsDoctor(appointmentId, doctorUserId);
    if (appt.status !== AppointmentStatus.CONFIRMED) {
      throw new BadRequestException('Only confirmed appointments can be completed');
    }
    appt.status = AppointmentStatus.COMPLETED;
    appt.completedAt = new Date();
    if (notes) appt.doctorNotes = notes;
    return this.appointmentRepo.save(appt);
  }

  async reschedule(
    appointmentId: string,
    userId: string,
    dto: RescheduleAppointmentDto,
  ): Promise<Appointment> {
    const appt = await this.appointmentRepo.findOne({ where: { id: appointmentId } });
    if (!appt) throw new NotFoundException('Appointment not found');
    if (appt.patientId !== userId) throw new ForbiddenException('Not your appointment');

    const cancellable = [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED];
    if (!cancellable.includes(appt.status)) {
      throw new BadRequestException('Appointment cannot be rescheduled at this stage');
    }

    const available = await this.doctorsService.getAvailableSlots(appt.doctorId, dto.newDate);
    if (!available.includes(dto.newSlotStartTime)) {
      throw new ConflictException('Selected slot is not available');
    }

    const doctor = await this.doctorRepo.findOne({ where: { id: appt.doctorId } });
    appt.appointmentDate = new Date(dto.newDate);
    appt.slotStartTime = dto.newSlotStartTime;
    appt.slotEndTime = this.addMinutes(dto.newSlotStartTime, doctor.slotDurationMinutes);
    appt.status = AppointmentStatus.PENDING;
    return this.appointmentRepo.save(appt);
  }

  private async getAppointmentAsDoctor(appointmentId: string, doctorUserId: string) {
    const appt = await this.appointmentRepo.findOne({ where: { id: appointmentId } });
    if (!appt) throw new NotFoundException('Appointment not found');
    const doctor = await this.doctorRepo.findOne({ where: { userId: doctorUserId } });
    if (!doctor || appt.doctorId !== doctor.id) throw new ForbiddenException('Access denied');
    return { appt, doctor };
  }

  private applyCommonFilters(qb: any, query: AppointmentQueryDto) {
    if (query.status) qb.andWhere('a.status = :status', { status: query.status });
    if (query.fromDate) qb.andWhere('a.appointmentDate >= :from', { from: query.fromDate });
    if (query.toDate) qb.andWhere('a.appointmentDate <= :to', { to: query.toDate });
    qb.orderBy('a.appointmentDate', 'DESC').addOrderBy('a.slotStartTime', 'ASC');
    const page = query.page || 1;
    const limit = query.limit || 10;
    qb.skip((page - 1) * limit).take(limit);
  }

  private paginate(data: any[], total: number, query: AppointmentQueryDto) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  private addMinutes(time: string, minutes: number): string {
    const [h, m] = time.split(':').map(Number);
    const total = h * 60 + m + minutes;
    return `${Math.floor(total / 60).toString().padStart(2, '0')}:${(total % 60).toString().padStart(2, '0')}`;
  }

  private generateBookingRef(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `HAH-${date}-${rand}`;
  }
}