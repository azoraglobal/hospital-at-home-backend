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

export enum ConditionStatus {
  ACTIVE = 'active',
  RESOLVED = 'resolved',
  CHRONIC = 'chronic',
  IN_REMISSION = 'in_remission',
}

export enum ConditionType {
  DIAGNOSIS = 'diagnosis',
  SURGERY = 'surgery',
  HOSPITALIZATION = 'hospitalization',
  CHRONIC_DISEASE = 'chronic_disease',
  FAMILY_HISTORY = 'family_history',
  OTHER = 'other',
}

@Entity('medical_histories')
export class MedicalHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PatientProfile, (p) => p.medicalHistories, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_profile_id' })
  patientProfile: PatientProfile;

  @Column({ name: 'patient_profile_id' })
  patientProfileId: string;

  @Column({ name: 'condition_name' })
  conditionName: string;

  @Column({ type: 'enum', enum: ConditionType, name: 'condition_type' })
  conditionType: ConditionType;

  @Column({ type: 'enum', enum: ConditionStatus, default: ConditionStatus.ACTIVE })
  status: ConditionStatus;

  @Column({ name: 'icd_code', length: 20, nullable: true })
  icdCode: string;

  @Column({ type: 'date', name: 'diagnosed_date', nullable: true })
  diagnosedDate: Date;

  @Column({ type: 'date', name: 'resolved_date', nullable: true })
  resolvedDate: Date;

  @Column({ name: 'treating_doctor', nullable: true })
  treatingDoctor: string;

  @Column({ name: 'hospital_clinic', nullable: true })
  hospitalClinic: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ name: 'is_hereditary', default: false })
  isHereditary: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}