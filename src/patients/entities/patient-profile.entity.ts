import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  OneToMany,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/user.entity';
import { FamilyMember } from './family-member.entity';
import { MedicalHistory } from './medical-history.entity';
import { Allergy } from './allergy.entity';
import { Vaccination } from './vaccination.entity';

export enum BloodGroup {
  A_POS = 'A+',
  A_NEG = 'A-',
  B_POS = 'B+',
  B_NEG = 'B-',
  AB_POS = 'AB+',
  AB_NEG = 'AB-',
  O_POS = 'O+',
  O_NEG = 'O-',
}

export enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}

@Entity('patient_profiles')
export class PatientProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'full_name' })
  fullName: string;

  @Column({ type: 'date', name: 'date_of_birth', nullable: true })
  dateOfBirth: Date;

  @Column({ type: 'enum', enum: Gender, nullable: true })
  gender: Gender;

  @Column({ type: 'enum', enum: BloodGroup, name: 'blood_group', nullable: true })
  bloodGroup: BloodGroup;

  @Column({ name: 'cnic', length: 15, nullable: true, unique: true })
  cnic: string;

  @Column({ name: 'phone_number', length: 20, nullable: true })
  phoneNumber: string;

  @Column({ name: 'emergency_contact_name', nullable: true })
  emergencyContactName: string;

  @Column({ name: 'emergency_contact_phone', length: 20, nullable: true })
  emergencyContactPhone: string;

  @Column({ name: 'emergency_contact_relation', nullable: true })
  emergencyContactRelation: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @Column({ nullable: true })
  city: string;

  @Column({ name: 'profile_picture_url', nullable: true })
  profilePictureUrl: string;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  height: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, nullable: true })
  weight: number;

  @Column({ name: 'marital_status', nullable: true })
  maritalStatus: string;

  @Column({ nullable: true })
  occupation: string;

  @Column({ name: 'insurance_provider', nullable: true })
  insuranceProvider: string;

  @Column({ name: 'insurance_policy_number', nullable: true })
  insurancePolicyNumber: string;

  @Column({ name: 'is_active', default: true })
  isActive: boolean;

  @OneToMany(() => FamilyMember, (fm) => fm.patientProfile, { cascade: true })
  familyMembers: FamilyMember[];

  @OneToMany(() => MedicalHistory, (mh) => mh.patientProfile, { cascade: true })
  medicalHistories: MedicalHistory[];

  @OneToMany(() => Allergy, (a) => a.patientProfile, { cascade: true })
  allergies: Allergy[];

  @OneToMany(() => Vaccination, (v) => v.patientProfile, { cascade: true })
  vaccinations: Vaccination[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}