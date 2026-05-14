import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { PatientProfile, BloodGroup, Gender } from './patient-profile.entity';

export enum Relationship {
  FATHER = 'father',
  MOTHER = 'mother',
  SPOUSE = 'spouse',
  SON = 'son',
  DAUGHTER = 'daughter',
  SIBLING = 'sibling',
  GRANDPARENT = 'grandparent',
  OTHER = 'other',
}

@Entity('family_members')
export class FamilyMember {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => PatientProfile, (p) => p.familyMembers, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'patient_profile_id' })
  patientProfile: PatientProfile;

  @Column({ name: 'patient_profile_id' })
  patientProfileId: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ type: 'enum', enum: Relationship })
  relationship: Relationship;

  @Column({ type: 'date', name: 'date_of_birth', nullable: true })
  dateOfBirth: Date;

  @Column({ type: 'enum', enum: Gender, enumName: 'patient_profiles_gender_enum', nullable: true })
  gender: Gender;

  @Column({ type: 'enum', enum: BloodGroup, enumName: 'patient_profiles_blood_group_enum', name: 'blood_group', nullable: true })
  bloodGroup: BloodGroup;

  @Column({ name: 'phone_number', length: 20, nullable: true })
  phoneNumber: string;

  @Column({ name: 'cnic', length: 15, nullable: true })
  cnic: string;

  @Column({ name: 'is_primary_contact', default: false })
  isPrimaryContact: boolean;

  @Column({ name: 'has_medical_conditions', default: false })
  hasMedicalConditions: boolean;

  @Column({ name: 'medical_notes', type: 'text', nullable: true })
  medicalNotes: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}