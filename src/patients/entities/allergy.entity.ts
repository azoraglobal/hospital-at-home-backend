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

export enum AllergyType {
  MEDICATION = 'medication',
  FOOD = 'food',
  ENVIRONMENTAL = 'environmental',
  INSECT = 'insect',
  LATEX = 'latex',
  OTHER = 'other',
}

export enum AllergySeverity {
  MILD = 'mild',
  MODERATE = 'moderate',
  SEVERE = 'severe',
  LIFE_THREATENING = 'life_threatening',
}

export enum AllergyStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  OUTGROWN = 'outgrown',
}

@Entity('allergies')
export class Allergy {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PatientProfile, (p) => p.allergies, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_profile_id' })
  patientProfile: PatientProfile;

  @Column({ name: 'patient_profile_id' })
  patientProfileId: string;

  @Column({ name: 'allergen_name' })
  allergenName: string;

  @Column({ type: 'enum', enum: AllergyType, name: 'allergy_type' })
  allergyType: AllergyType;

  @Column({ type: 'enum', enum: AllergySeverity })
  severity: AllergySeverity;

  @Column({ type: 'enum', enum: AllergyStatus, default: AllergyStatus.ACTIVE })
  status: AllergyStatus;

  @Column({ name: 'reaction_description', type: 'text', nullable: true })
  reactionDescription: string;

  @Column({ name: 'onset_date', type: 'date', nullable: true })
  onsetDate: Date;

  @Column({ name: 'diagnosed_by', nullable: true })
  diagnosedBy: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}