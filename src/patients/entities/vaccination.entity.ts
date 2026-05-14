import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PatientProfile } from './patient-profile.entity';

export enum VaccinationStatus {
  COMPLETED = 'completed',
  PARTIAL = 'partial',
  SCHEDULED = 'scheduled',
  OVERDUE = 'overdue',
  DECLINED = 'declined',
}

@Entity('vaccinations')
export class Vaccination {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PatientProfile, (p) => p.vaccinations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_profile_id' })
  patientProfile: PatientProfile;

  @Column({ name: 'patient_profile_id' })
  patientProfileId: string;

  @Column({ name: 'vaccine_name' })
  vaccineName: string;

  @Column({ name: 'vaccine_brand', nullable: true })
  vaccineBrand: string;

  @Column({ type: 'enum', enum: VaccinationStatus, default: VaccinationStatus.COMPLETED })
  status: VaccinationStatus;

  @Column({ name: 'dose_number', type: 'int', nullable: true })
  doseNumber: number;

  @Column({ name: 'total_doses', type: 'int', nullable: true })
  totalDoses: number;

  @Column({ name: 'administered_date', type: 'date', nullable: true })
  administeredDate: Date;

  @Column({ name: 'next_due_date', type: 'date', nullable: true })
  nextDueDate: Date;

  @Column({ name: 'administered_by', nullable: true })
  administeredBy: string;

  @Column({ name: 'administered_at', nullable: true })
  administeredAt: string;

  @Column({ name: 'batch_number', nullable: true })
  batchNumber: string;

  @Column({ name: 'certificate_url', nullable: true })
  certificateUrl: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}