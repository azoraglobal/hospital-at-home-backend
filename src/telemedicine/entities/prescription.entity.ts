import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum PrescriptionStatus {
  DRAFT = 'draft',
  ISSUED = 'issued',
  DISPENSED = 'dispensed',
  CANCELLED = 'cancelled',
}

@Entity('prescriptions')
export class Prescription {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  prescriptionRef: string;

  @Column()
  sessionId: string;

  @Column()
  patientId: string;

  @Column()
  doctorId: string;

  @Column({ type: 'enum', enum: PrescriptionStatus, default: PrescriptionStatus.DRAFT })
  status: PrescriptionStatus;

  @Column({ type: 'text', nullable: true })
  diagnosis: string;

  @Column({ type: 'simple-array', nullable: true })
  icdCodes: string[];

  @Column({ type: 'text', nullable: true })
  clinicalNotes: string;

  @Column({ type: 'text', nullable: true })
  specialInstructions: string;

  @Column({ type: 'text', nullable: true })
  labInvestigations: string;

  @Column({ type: 'text', nullable: true })
  radiologyInvestigations: string;

  @Column({ default: false })
  followUpRequired: boolean;

  @Column({ type: 'timestamp', nullable: true })
  followUpDate: Date;

  @Column({ type: 'timestamp' })
  issuedAt: Date;

  @Column({ nullable: true })
  pdfUrl: string;

  @Column({ nullable: true })
  digitalSignatureUrl: string;

  @Column({ type: 'jsonb', nullable: true })
  doctorSnapshot: Record<string, any>;

  @Column({ type: 'jsonb', nullable: true })
  patientSnapshot: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}