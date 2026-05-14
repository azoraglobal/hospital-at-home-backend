import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('otp_verifications')
export class OtpVerification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ nullable: true })
  email: string;

  @Column({ name: 'otp_code' })
  otpCode: string;

  @Column()
  purpose: string;

  @Column({ name: 'is_used', default: false })
  isUsed: boolean;

  @Column({ name: 'expires_at' })
  expiresAt: Date;

  @Column({ default: 0 })
  attempts: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}