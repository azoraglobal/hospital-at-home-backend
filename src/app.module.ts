import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
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
        ],
        synchronize: false,
        logging: true,
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    PatientsModule,
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