import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { User } from '../../users/user.entity';

export enum AppointmentStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED_BY_PATIENT = 'cancelled_by_patient',
  CANCELLED_BY_DOCTOR = 'cancelled_by_doctor',
  NO_SHOW = 'no_show',
}

export enum AppointmentType {
  HOME_VISIT = 'home_visit',
  VIDEO_CALL = 'video_call',
  CLINIC = 'clinic',
}

@Entity('appointments')
export class Appointment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Doctor)
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor;

  @Column({ name: 'doctor_id' })
  doctorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'patient_id' })
  patient: User;

  @Column({ name: 'patient_id' })
  patientId: string;

  // ── Scheduling ──────────────────────────────
  @Column({ name: 'appointment_date', type: 'date' })
  appointmentDate: Date;

  @Column({ name: 'slot_start_time', type: 'time' })
  slotStartTime: string;

  @Column({ name: 'slot_end_time', type: 'time' })
  slotEndTime: string;

  @Column({
    name: 'appointment_type',
    type: 'enum',
    enum: AppointmentType,
    default: AppointmentType.HOME_VISIT,
  })
  appointmentType: AppointmentType;

  // ── Location ────────────────────────────────
  @Column({ name: 'patient_address', type: 'text', nullable: true })
  patientAddress: string;

  @Column({ name: 'patient_lat', type: 'decimal', precision: 10, scale: 8, nullable: true })
  patientLat: number;

  @Column({ name: 'patient_lng', type: 'decimal', precision: 11, scale: 8, nullable: true })
  patientLng: number;

  // ── Clinical ────────────────────────────────
  @Column({ name: 'chief_complaint', type: 'text', nullable: true })
  chiefComplaint: string;

  @Column({ name: 'doctor_notes', type: 'text', nullable: true })
  doctorNotes: string;

  @Column({ name: 'prescription_url', nullable: true })
  prescriptionUrl: string;

  // ── Payment ─────────────────────────────────
  @Column({ name: 'fee_charged', type: 'decimal', precision: 10, scale: 2, nullable: true })
  feeCharged: number;

  @Column({ name: 'is_paid', default: false })
  isPaid: boolean;

  @Column({ name: 'payment_method', nullable: true })
  paymentMethod: string;

  @Column({ name: 'payment_reference', nullable: true })
  paymentReference: string;

  // ── Status ──────────────────────────────────
  @Column({
    type: 'enum',
    enum: AppointmentStatus,
    default: AppointmentStatus.PENDING,
  })
  status: AppointmentStatus;

  @Column({ name: 'cancellation_reason', type: 'text', nullable: true })
  cancellationReason: string;

  @Column({ name: 'confirmed_at', type: 'timestamptz', nullable: true })
  confirmedAt: Date;

  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt: Date;

  @Column({ name: 'booking_reference', unique: true, nullable: true })
  bookingReference: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}