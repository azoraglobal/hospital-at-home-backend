import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Doctor } from '../../doctors/entities/doctor.entity';
import { User } from '../../users/user.entity';

@Entity('doctor_reviews')
export class DoctorReview {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Doctor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'doctor_id' })
  doctor: Doctor;

  @Column({ name: 'doctor_id' })
  doctorId: string;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'patient_id' })
  patient: User;

  @Column({ name: 'patient_id' })
  patientId: string;

  @Column({ name: 'appointment_id' })
  appointmentId: string;

  // ── Ratings (1-5) ────────────────────────────
  @Column({ name: 'overall_rating', type: 'int' })
  overallRating: number;

  @Column({ name: 'punctuality_rating', type: 'int', nullable: true })
  punctualityRating: number;

  @Column({ name: 'behavior_rating', type: 'int', nullable: true })
  behaviorRating: number;

  @Column({ name: 'knowledge_rating', type: 'int', nullable: true })
  knowledgeRating: number;

  // ── Review content ───────────────────────────
  @Column({ type: 'text', nullable: true })
  comment: string;

  @Column({ name: 'is_anonymous', default: false })
  isAnonymous: boolean;

  // ── Moderation ───────────────────────────────
  @Column({ name: 'is_approved', default: true })
  isApproved: boolean;

  @Column({ name: 'is_flagged', default: false })
  isFlagged: boolean;

  @Column({ name: 'doctor_reply', type: 'text', nullable: true })
  doctorReply: string;

  @Column({ name: 'replied_at', type: 'timestamptz', nullable: true })
  repliedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}