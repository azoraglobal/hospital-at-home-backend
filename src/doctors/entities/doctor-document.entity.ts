import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
} from 'typeorm';
import { Doctor } from './doctor.entity';

export enum DocumentType {
  PMDC_CERTIFICATE = 'pmdc_certificate',
  DEGREE = 'degree',
  CNIC = 'cnic',
  EXPERIENCE_LETTER = 'experience_letter',
  OTHER = 'other',
}

@Entity('doctor_documents')
export class DoctorDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Doctor, (d) => d.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor;

  @Column({ name: 'doctor_id' })
  doctorId: string;

  @Column({ type: 'enum', enum: DocumentType, name: 'document_type' })
  documentType: DocumentType;

  @Column({ name: 'file_url' })
  fileUrl: string;

  @Column({ name: 'original_name', nullable: true })
  originalName: string;

  @Column({ name: 'is_verified', default: false })
  isVerified: boolean;

  @Column({ name: 'verified_by', nullable: true })
  verifiedBy: string;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt: Date;

  @CreateDateColumn({ name: 'uploaded_at' })
  uploadedAt: Date;
}