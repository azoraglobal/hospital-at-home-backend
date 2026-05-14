import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DoctorsController } from './doctors.controller';
import { DoctorsService } from './doctors.service';
import { Doctor } from './entities/doctor.entity';
import { DoctorAvailability } from './entities/doctor-availability.entity';
import { DoctorDocument } from './entities/doctor-document.entity';
import { Specialization } from './entities/specialization.entity';
import { Appointment } from '../appointments/entities/appointment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Doctor,
      DoctorAvailability,
      DoctorDocument,
      Specialization,
      Appointment,
    ]),
  ],
  controllers: [DoctorsController],
  providers: [DoctorsService],
  exports: [DoctorsService],
})
export class DoctorsModule {}