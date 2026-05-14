import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/guards/jwt-auth.guard';
import { RolesGuard } from './auth/guards/roles.guard';
import { User } from './users/user.entity';
import { OtpVerification } from './otp/otp-verification.entity';
import { PatientsModule } from './patients/patients.module';
import { PatientProfile } from './patients/entities/patient-profile.entity';
import { FamilyMember } from './patients/entities/family-member.entity';
import { MedicalHistory } from './patients/entities/medical-history.entity';
import { Allergy } from './patients/entities/allergy.entity';
import { Vaccination } from './patients/entities/vaccination.entity';
import { DoctorsModule } from './doctors/doctors.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { ReviewsModule } from './reviews/reviews.module';
import { Doctor } from './doctors/entities/doctor.entity';
import { DoctorAvailability } from './doctors/entities/doctor-availability.entity';
import { DoctorDocument } from './doctors/entities/doctor-document.entity';
import { Specialization } from './doctors/entities/specialization.entity';
import { Appointment } from './appointments/entities/appointment.entity';
import { DoctorReview } from './reviews/entities/doctor-review.entity';
import { TelemedicineModule } from './telemedicine/telemedicine.module';
import { TelemedicineSession } from './telemedicine/entities/telemedicine-session.entity';
import { Prescription } from './telemedicine/entities/prescription.entity';
import { PrescriptionMedicine } from './telemedicine/entities/prescription-medicine.entity';
import { ConsultationChatMessage } from './telemedicine/entities/consultation-chat-message.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventEmitterModule.forRoot(),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        host: configService.get('DB_HOST'),
        port: parseInt(configService.get<string>('DB_PORT', '5432')),
        username: configService.get('DB_USERNAME'),
        password: configService.get('DB_PASSWORD'),
        database: configService.get('DB_NAME'),
        entities: [
          User,
          OtpVerification,
          PatientProfile,
          FamilyMember,
          MedicalHistory,
          Allergy,
          Vaccination,
          Doctor,
          DoctorAvailability,
          DoctorDocument,
          Specialization,
          Appointment,
          DoctorReview,
          TelemedicineSession,
          Prescription,
          PrescriptionMedicine,
          ConsultationChatMessage,
        ],
        synchronize: false,
        logging: true,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    PatientsModule,
    DoctorsModule,
    AppointmentsModule,
    ReviewsModule,
    TelemedicineModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}