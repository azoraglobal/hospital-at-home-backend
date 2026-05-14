import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  OneToMany,
  JoinColumn,
  ManyToMany,
  JoinTable,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { DoctorAvailability } from './doctor-availability.entity';
import { DoctorDocument } from './doctor-document.entity';
import { Specialization } from './specialization.entity';

export enum DoctorStatus {
  PENDING = 'pending',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  REJECTED = 'rejected',
}

export enum PMDCVerificationStatus {
  UNVERIFIED = 'unverified',
  PENDING = 'pending',
  VERIFIED = 'verified',
  FAILED = 'failed',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

@Entity('doctors')
export class Doctor {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { eager: true })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  // ── Personal Info ──────────────────────────────
  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ nullable: true })
  gender: Gender;

  @Column({ name: 'date_of_birth', type: 'date', nullable: true })
  dateOfBirth: Date;

  @Column({ name: 'profile_photo_url', nullable: true })
  profilePhotoUrl: string;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column({ nullable: true })
  languages: string;

  // ── Contact ────────────────────────────────────
  @Column({ name: 'phone_number', nullable: true })
  phoneNumber: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  address: string;

  // ── PMDC Credentials ──────────────────────────
  @Column({ name: 'pmdc_number', unique: true, nullable: true })
  pmdcNumber: string;

  @Column({
    name: 'pmdc_verification_status',
    type: 'enum',
    enum: PMDCVerificationStatus,
    default: PMDCVerificationStatus.UNVERIFIED,
  })
  pmdcVerificationStatus: PMDCVerificationStatus;

  @Column({ name: 'pmdc_verified_at', type: 'timestamptz', nullable: true })
  pmdcVerifiedAt: Date;

  @Column({ name: 'pmdc_rejection_reason', type: 'text', nullable: true })
  pmdcRejectionReason: string;

  // ── Qualifications ────────────────────────────
  @Column({ name: 'medical_degree', nullable: true })
  medicalDegree: string;

  @Column({ name: 'medical_college', nullable: true })
  medicalCollege: string;

  @Column({ name: 'graduation_year', nullable: true })
  graduationYear: number;

  @Column({ name: 'additional_qualifications', type: 'text', nullable: true })
  additionalQualifications: string;

  @Column({ name: 'years_of_experience', default: 0 })
  yearsOfExperience: number;

  // ── Specializations ───────────────────────────
  @ManyToMany(() => Specialization, { eager: true })
  @JoinTable({
    name: 'doctor_specialization_map',
    joinColumn: { name: 'doctor_id' },
    inverseJoinColumn: { name: 'specialization_id' },
  })
  specializations: Specialization[];

  @Column({ name: 'primary_specialization', nullable: true })
  primarySpecialization: string;

  // ── Consultation ──────────────────────────────
  @Column({
    name: 'consultation_fee',
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: 0,
  })
  consultationFee: number;

  @Column({ name: 'follow_up_fee', type: 'decimal', precision: 10, scale: 2, nullable: true })
  followUpFee: number;

  @Column({ name: 'home_visit_fee', type: 'decimal', precision: 10, scale: 2, nullable: true })
  homeVisitFee: number;

  @Column({ name: 'accepts_home_visits', default: true })
  acceptsHomeVisits: boolean;

  @Column({ name: 'accepts_video_calls', default: false })
  acceptsVideoCalls: boolean;

  @Column({ name: 'slot_duration_minutes', default: 30 })
  slotDurationMinutes: number;

  // ── Status ────────────────────────────────────
  @Column({
    type: 'enum',
    enum: DoctorStatus,
    default: DoctorStatus.PENDING,
  })
  status: DoctorStatus;

  @Column({ name: 'is_available_now', default: false })
  isAvailableNow: boolean;

  // ── Ratings ───────────────────────────────────
  @Column({ name: 'average_rating', type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating: number;

  @Column({ name: 'total_reviews', default: 0 })
  totalReviews: number;

  @Column({ name: 'total_appointments', default: 0 })
  totalAppointments: number;

  // ── Relations ─────────────────────────────────
  @OneToMany(() => DoctorAvailability, (a) => a.doctor, { cascade: true })
  availability: DoctorAvailability[];

  @OneToMany(() => DoctorDocument, (d) => d.doctor, { cascade: true })
  documents: DoctorDocument[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}