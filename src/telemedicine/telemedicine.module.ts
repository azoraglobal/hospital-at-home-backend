import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';

import { TelemedicineController } from './telemedicine.controller';
import { TelemedicineService } from './telemedicine.service';
import { TelemedicineGateway } from './telemedicine.gateway';
import { AgoraService } from './agora.service';

import { TelemedicineSession } from './entities/telemedicine-session.entity';
import { Prescription } from './entities/prescription.entity';
import { PrescriptionMedicine } from './entities/prescription-medicine.entity';
import { ConsultationChatMessage } from './entities/consultation-chat-message.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      TelemedicineSession,
      Prescription,
      PrescriptionMedicine,
      ConsultationChatMessage,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRES_IN', '7d') },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [TelemedicineController],
  providers: [TelemedicineService, TelemedicineGateway, AgoraService],
  exports: [TelemedicineService, AgoraService],
})
export class TelemedicineModule {}