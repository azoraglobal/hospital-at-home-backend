import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PatientsController } from './patients.controller';
import { PatientsService } from './patients.service';

import { PatientProfile } from './entities/patient-profile.entity';
import { FamilyMember } from './entities/family-member.entity';
import { MedicalHistory } from './entities/medical-history.entity';
import { Allergy } from './entities/allergy.entity';
import { Vaccination } from './entities/vaccination.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PatientProfile,
      FamilyMember,
      MedicalHistory,
      Allergy,
      Vaccination,
    ]),
  ],
  controllers: [PatientsController],
  providers: [PatientsService],
  exports: [PatientsService],
})
export class PatientsModule {}