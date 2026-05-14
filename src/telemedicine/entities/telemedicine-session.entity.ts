import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum SessionStatus {
  SCHEDULED = 'scheduled',
  WAITING = 'waiting',
  ACTIVE = 'active',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  MISSED = 'missed',
}

export enum SessionType {
  VIDEO = 'video',
  AUDIO = 'audio',
}

@Entity('telemedicine_sessions')
export class TelemedicineSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  sessionRef: string;

  @Column()
  bookingId: string;

  @Column()
  patientId: string;

  @Column()
  doctorId: string;

  @Column({ type: 'enum', enum: SessionType, default: SessionType.VIDEO })
  sessionType: SessionType;

  @Column({ type: 'enum', enum: SessionStatus, default: SessionStatus.SCHEDULED })
  status: SessionStatus;

  @Column({ nullable: true })
  agoraChannel: string;

  @Column({ nullable: true })
  agoraPatientToken: string;

  @Column({ nullable: true })
  agoraDoctorToken: string;

  @Column({ nullable: true })
  agoraAppId: string;

  @Column({ type: 'int', nullable: true })
  agoraPatientUid: number;

  @Column({ type: 'int', nullable: true })
  agoraDoctorUid: number;

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  endedAt: Date;

  @Column({ type: 'int', nullable: true })
  durationSeconds: number;

  @Column({ default: false })
  isRecordingEnabled: boolean;

  @Column({ nullable: true })
  recordingResourceId: string;

  @Column({ nullable: true })
  recordingSid: string;

  @Column({ nullable: true })
  recordingUrl: string;

  @Column({ type: 'text', nullable: true })
  consultationNotes: string;

  @Column({ type: 'text', nullable: true })
  chiefComplaint: string;

  @Column({ type: 'text', nullable: true })
  diagnosis: string;

  @Column({ type: 'simple-array', nullable: true })
  icdCodes: string[];

  @Column({ default: false })
  followUpRequired: boolean;

  @Column({ type: 'timestamp', nullable: true })
  followUpDate: Date;

  @Column({ nullable: true })
  followUpBookingId: string;

  @Column({ type: 'jsonb', nullable: true })
  vitals: Record<string, any>;

  @Column({ nullable: true })
  cancelledBy: string;

  @Column({ type: 'text', nullable: true })
  cancellationReason: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  consultationFee: number;

  @Column({ default: false })
  isPaid: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}