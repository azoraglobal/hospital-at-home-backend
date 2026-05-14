import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum MedicineForm {
  TABLET = 'tablet',
  CAPSULE = 'capsule',
  SYRUP = 'syrup',
  INJECTION = 'injection',
  CREAM = 'cream',
  DROPS = 'drops',
  INHALER = 'inhaler',
  PATCH = 'patch',
  SUPPOSITORY = 'suppository',
  OTHER = 'other',
}

export enum MedicineFrequency {
  OD = 'OD',
  BD = 'BD',
  TDS = 'TDS',
  QID = 'QID',
  PRN = 'PRN',
  STAT = 'STAT',
  HS = 'HS',
  AC = 'AC',
  PC = 'PC',
}

export enum MedicineRoute {
  ORAL = 'oral',
  IV = 'intravenous',
  IM = 'intramuscular',
  SC = 'subcutaneous',
  TOPICAL = 'topical',
  SUBLINGUAL = 'sublingual',
  RECTAL = 'rectal',
  INHALATION = 'inhalation',
  OPHTHALMIC = 'ophthalmic',
  OTIC = 'otic',
  NASAL = 'nasal',
}

@Entity('prescription_medicines')
export class PrescriptionMedicine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  prescriptionId: string;

  @Column()
  medicineName: string;

  @Column({ nullable: true })
  genericName: string;

  @Column({ nullable: true })
  brandName: string;

  @Column({ type: 'enum', enum: MedicineForm, default: MedicineForm.TABLET })
  form: MedicineForm;

  @Column()
  strength: string;

  @Column({ type: 'enum', enum: MedicineFrequency })
  frequency: MedicineFrequency;

  @Column({ type: 'enum', enum: MedicineRoute, default: MedicineRoute.ORAL })
  route: MedicineRoute;

  @Column()
  duration: string;

  @Column({ type: 'int', nullable: true })
  durationDays: number;

  @Column({ nullable: true })
  dose: string;

  @Column({ type: 'int', nullable: true })
  quantity: number;

  @Column({ type: 'text', nullable: true })
  instructions: string;

  @Column({ default: false })
  isControlled: boolean;

  @Column({ type: 'int', default: 0 })
  sortOrder: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}