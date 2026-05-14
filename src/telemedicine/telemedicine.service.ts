import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, Between, In } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { format } from 'date-fns';

import { TelemedicineSession, SessionStatus, SessionType } from './entities/telemedicine-session.entity';
import { Prescription, PrescriptionStatus } from './entities/prescription.entity';
import { PrescriptionMedicine } from './entities/prescription-medicine.entity';
import { ConsultationChatMessage, MessageType, SenderRole } from './entities/consultation-chat-message.entity';
import { AgoraService } from './agora.service';
import {
  InitiateSessionDto,
  EndSessionDto,
  UpdateSessionNotesDto,
  CancelSessionDto,
  SessionQueryDto,
  CreatePrescriptionDto,
  UpdatePrescriptionDto,
  SendChatMessageDto,
  ChatQueryDto,
  StartRecordingDto,
  StopRecordingDto,
} from './dto/telemedicine.dto';

@Injectable()
export class TelemedicineService {
  private readonly logger = new Logger(TelemedicineService.name);

  constructor(
    @InjectRepository(TelemedicineSession)
    private sessionRepo: Repository<TelemedicineSession>,

    @InjectRepository(Prescription)
    private prescriptionRepo: Repository<Prescription>,

    @InjectRepository(PrescriptionMedicine)
    private medicineRepo: Repository<PrescriptionMedicine>,

    @InjectRepository(ConsultationChatMessage)
    private chatRepo: Repository<ConsultationChatMessage>,

    private agoraService: AgoraService,
    private dataSource: DataSource,
    private eventEmitter: EventEmitter2,
  ) {}

  // ─── Reference Generation ─────────────────────────────────────────────────

  private generateSessionRef(): string {
    const date = format(new Date(), 'yyyyMMdd');
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `HAH-TEL-${date}-${code}`;
  }

  private generatePrescriptionRef(): string {
    const date = format(new Date(), 'yyyyMMdd');
    const code = Math.random().toString(36).substring(2, 7).toUpperCase();
    return `HAH-RX-${date}-${code}`;
  }

  // ─── Session: Initiate ────────────────────────────────────────────────────

  async initiateSession(
    dto: InitiateSessionDto,
    initiatorId: string,
    initiatorRole: 'doctor' | 'patient',
  ): Promise<TelemedicineSession> {
    const existing = await this.sessionRepo.findOne({
      where: {
        bookingId: dto.bookingId,
        status: In([SessionStatus.SCHEDULED, SessionStatus.WAITING, SessionStatus.ACTIVE]),
      },
    });
    if (existing) {
      throw new BadRequestException(
        `An active session already exists for this booking: ${existing.sessionRef}`,
      );
    }

    const sessionRef = this.generateSessionRef();
    const tokenSet = await this.agoraService.generateTokenSet(sessionRef);

    const session = this.sessionRepo.create({
      sessionRef,
      bookingId: dto.bookingId,
      patientId: initiatorRole === 'patient' ? initiatorId : '',
      doctorId: initiatorRole === 'doctor' ? initiatorId : '',
      sessionType: dto.sessionType ?? SessionType.VIDEO,
      status: SessionStatus.WAITING,
      chiefComplaint: dto.chiefComplaint,
      isRecordingEnabled: dto.enableRecording ?? false,
      agoraChannel: tokenSet.channel,
      agoraAppId: tokenSet.appId,
      agoraPatientToken: tokenSet.patientToken,
      agoraDoctorToken: tokenSet.doctorToken,
      agoraPatientUid: tokenSet.patientUid,
      agoraDoctorUid: tokenSet.doctorUid,
      scheduledAt: new Date(),
    });

    const saved = await this.sessionRepo.save(session);

    await this.postSystemMessage(
      saved.id,
      `Consultation session ${sessionRef} initiated. Waiting for both parties to join.`,
    );

    this.eventEmitter.emit('telemedicine.session.initiated', { session: saved });
    this.logger.log(`Session initiated: ${sessionRef}`);
    return saved;
  }

  // ─── Session: Join ────────────────────────────────────────────────────────

  async joinSession(
    sessionId: string,
    userId: string,
    userRole: 'doctor' | 'patient',
  ): Promise<{ session: TelemedicineSession; token: string; uid: number }> {
    const session = await this.findSessionOrFail(sessionId);

    if (![SessionStatus.WAITING, SessionStatus.SCHEDULED].includes(session.status)) {
      throw new BadRequestException(`Cannot join session in status: ${session.status}`);
    }

    if (userRole === 'patient' && session.patientId !== userId) {
      throw new ForbiddenException('You are not the patient for this session');
    }
    if (userRole === 'doctor' && session.doctorId !== userId) {
      throw new ForbiddenException('You are not the doctor for this session');
    }

    if (userRole === 'doctor' && session.status !== SessionStatus.ACTIVE) {
      session.status = SessionStatus.ACTIVE;
      session.startedAt = new Date();
      await this.sessionRepo.save(session);
      await this.postSystemMessage(session.id, 'Doctor has joined. Consultation started.');
      this.eventEmitter.emit('telemedicine.session.started', { session });
    }

    const token = userRole === 'patient' ? session.agoraPatientToken : session.agoraDoctorToken;
    const uid   = userRole === 'patient' ? session.agoraPatientUid   : session.agoraDoctorUid;

    return { session, token, uid };
  }

  // ─── Session: End ─────────────────────────────────────────────────────────

  async endSession(
    sessionId: string,
    dto: EndSessionDto,
    doctorId: string,
  ): Promise<TelemedicineSession> {
    const session = await this.findSessionOrFail(sessionId);

    if (session.doctorId !== doctorId) {
      throw new ForbiddenException('Only the consulting doctor can end this session');
    }
    if (session.status !== SessionStatus.ACTIVE) {
      throw new BadRequestException(`Session is not active (status: ${session.status})`);
    }

    const endedAt = new Date();
    const durationSeconds = session.startedAt
      ? Math.floor((endedAt.getTime() - session.startedAt.getTime()) / 1000)
      : 0;

    Object.assign(session, {
      status: SessionStatus.COMPLETED,
      endedAt,
      durationSeconds,
      consultationNotes: dto.consultationNotes,
      diagnosis: dto.diagnosis,
      icdCodes: dto.icdCodes,
      followUpRequired: dto.followUpRequired ?? false,
      followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : null,
      vitals: dto.vitals,
    });

    const saved = await this.sessionRepo.save(session);

    await this.postSystemMessage(
      session.id,
      `Consultation ended. Duration: ${Math.floor(durationSeconds / 60)} min ${durationSeconds % 60} sec.`,
    );

    this.eventEmitter.emit('telemedicine.session.completed', { session: saved });
    this.logger.log(`Session completed: ${session.sessionRef} — ${durationSeconds}s`);
    return saved;
  }

  // ─── Session: Refresh Token ───────────────────────────────────────────────

  async refreshAgoraToken(
    sessionId: string,
    userId: string,
    userRole: 'doctor' | 'patient',
  ): Promise<{ token: string }> {
    const session = await this.findSessionOrFail(sessionId);

    if (session.status !== SessionStatus.ACTIVE) {
      throw new BadRequestException('Session is not active');
    }

    const uid = userRole === 'patient' ? session.agoraPatientUid : session.agoraDoctorUid;
    const token = await this.agoraService.refreshToken(session.agoraChannel, uid);

    if (userRole === 'patient') {
      session.agoraPatientToken = token;
    } else {
      session.agoraDoctorToken = token;
    }
    await this.sessionRepo.save(session);
    return { token };
  }

  // ─── Session: Update Notes ────────────────────────────────────────────────

  async updateSessionNotes(
    sessionId: string,
    dto: UpdateSessionNotesDto,
    doctorId: string,
  ): Promise<TelemedicineSession> {
    const session = await this.findSessionOrFail(sessionId);

    if (session.doctorId !== doctorId) {
      throw new ForbiddenException('Only the consulting doctor can update notes');
    }

    Object.assign(session, {
      consultationNotes: dto.consultationNotes,
      diagnosis: dto.diagnosis ?? session.diagnosis,
      icdCodes: dto.icdCodes ?? session.icdCodes,
      vitals: dto.vitals ?? session.vitals,
    });

    return this.sessionRepo.save(session);
  }

  // ─── Session: Cancel ──────────────────────────────────────────────────────

  async cancelSession(
    sessionId: string,
    dto: CancelSessionDto,
    cancelledById: string,
  ): Promise<TelemedicineSession> {
    const session = await this.findSessionOrFail(sessionId);

    if (session.status === SessionStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed session');
    }

    Object.assign(session, {
      status: SessionStatus.CANCELLED,
      cancelledBy: cancelledById,
      cancellationReason: dto.reason,
    });

    const saved = await this.sessionRepo.save(session);
    this.eventEmitter.emit('telemedicine.session.cancelled', { session: saved });
    return saved;
  }

  // ─── Session: Query ───────────────────────────────────────────────────────

  async getSessionsByDoctor(
    doctorId: string,
    query: SessionQueryDto,
  ): Promise<{ sessions: TelemedicineSession[]; total: number }> {
    const where: any = { doctorId };
    if (query.status) where.status = query.status;
    if (query.fromDate && query.toDate) {
      where.scheduledAt = Between(new Date(query.fromDate), new Date(query.toDate));
    }

    const [sessions, total] = await this.sessionRepo.findAndCount({
      where,
      order: { scheduledAt: 'DESC' },
      skip: ((query.page ?? 1) - 1) * (query.limit ?? 20),
      take: query.limit ?? 20,
    });
    return { sessions, total };
  }

  async getSessionsByPatient(
    patientId: string,
    query: SessionQueryDto,
  ): Promise<{ sessions: TelemedicineSession[]; total: number }> {
    const where: any = { patientId };
    if (query.status) where.status = query.status;

    const [sessions, total] = await this.sessionRepo.findAndCount({
      where,
      order: { scheduledAt: 'DESC' },
      skip: ((query.page ?? 1) - 1) * (query.limit ?? 20),
      take: query.limit ?? 20,
    });
    return { sessions, total };
  }

  async getSessionById(sessionId: string): Promise<TelemedicineSession> {
    return this.findSessionOrFail(sessionId);
  }

  // ─── Recording ────────────────────────────────────────────────────────────

  async startRecording(dto: StartRecordingDto, doctorId: string): Promise<{ resourceId: string; sid: string }> {
    const session = await this.findSessionOrFail(dto.sessionId);

    if (session.doctorId !== doctorId) {
      throw new ForbiddenException('Only the doctor can start recording');
    }
    if (session.status !== SessionStatus.ACTIVE) {
      throw new BadRequestException('Session must be active to record');
    }
    if (session.recordingSid) {
      throw new BadRequestException('Recording is already in progress');
    }

    const { resourceId, sid } = await this.agoraService.startCloudRecording(
      session.agoraChannel,
      session.agoraDoctorUid,
      session.agoraDoctorToken,
    );

    session.isRecordingEnabled = true;
    session.recordingResourceId = resourceId;
    session.recordingSid = sid;
    await this.sessionRepo.save(session);

    await this.postSystemMessage(session.id, 'Session recording has started.');
    return { resourceId, sid };
  }

  async stopRecording(dto: StopRecordingDto, doctorId: string): Promise<{ recordingUrl: string }> {
    const session = await this.findSessionOrFail(dto.sessionId);

    if (session.doctorId !== doctorId) {
      throw new ForbiddenException('Only the doctor can stop recording');
    }

    const { recordingUrl } = await this.agoraService.stopCloudRecording(
      session.agoraChannel,
      session.agoraDoctorUid,
      dto.resourceId,
      dto.sid,
    );

    session.recordingUrl = recordingUrl;
    session.recordingResourceId = null;
    session.recordingSid = null;
    await this.sessionRepo.save(session);

    await this.postSystemMessage(session.id, 'Session recording has stopped.');
    return { recordingUrl };
  }

  // ─── Prescriptions ────────────────────────────────────────────────────────

  async createPrescription(
    dto: CreatePrescriptionDto,
    doctorId: string,
  ): Promise<Prescription> {
    const session = await this.findSessionOrFail(dto.sessionId);

    if (session.doctorId !== doctorId) {
      throw new ForbiddenException('Only the session doctor can issue prescriptions');
    }
    if (![SessionStatus.ACTIVE, SessionStatus.COMPLETED].includes(session.status)) {
      throw new BadRequestException('Prescription can only be created for active or completed sessions');
    }

    const existing = await this.prescriptionRepo.findOne({
      where: {
        sessionId: dto.sessionId,
        status: In([PrescriptionStatus.DRAFT, PrescriptionStatus.ISSUED]),
      },
    });
    if (existing) {
      throw new BadRequestException(
        `Prescription ${existing.prescriptionRef} already exists for this session`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const prescription = queryRunner.manager.create(Prescription, {
        prescriptionRef: this.generatePrescriptionRef(),
        sessionId: dto.sessionId,
        patientId: session.patientId,
        doctorId,
        diagnosis: dto.diagnosis,
        icdCodes: dto.icdCodes,
        clinicalNotes: dto.clinicalNotes,
        specialInstructions: dto.specialInstructions,
        labInvestigations: dto.labInvestigations,
        radiologyInvestigations: dto.radiologyInvestigations,
        followUpRequired: dto.followUpRequired ?? false,
        followUpDate: dto.followUpDate ? new Date(dto.followUpDate) : null,
        status: PrescriptionStatus.ISSUED,
        issuedAt: new Date(),
        doctorSnapshot: { doctorId },
        patientSnapshot: { patientId: session.patientId },
      });

      const savedPrescription = await queryRunner.manager.save(Prescription, prescription);

      const medicines = dto.medicines.map((m, idx) =>
        queryRunner.manager.create(PrescriptionMedicine, {
          ...m,
          prescriptionId: savedPrescription.id,
          sortOrder: idx,
        }),
      );
      await queryRunner.manager.save(PrescriptionMedicine, medicines);

      await queryRunner.commitTransaction();

      this.eventEmitter.emit('telemedicine.prescription.created', {
        prescription: savedPrescription,
        sessionRef: session.sessionRef,
      });

      await this.postSystemMessage(
        session.id,
        `Prescription ${savedPrescription.prescriptionRef} has been issued.`,
      );

      this.logger.log(`Prescription issued: ${savedPrescription.prescriptionRef}`);
      return savedPrescription;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async updatePrescription(
    prescriptionId: string,
    dto: UpdatePrescriptionDto,
    doctorId: string,
  ): Promise<Prescription> {
    const prescription = await this.prescriptionRepo.findOne({ where: { id: prescriptionId } });
    if (!prescription) throw new NotFoundException('Prescription not found');

    if (prescription.doctorId !== doctorId) {
      throw new ForbiddenException('Only the issuing doctor can update this prescription');
    }
    if (prescription.status === PrescriptionStatus.DISPENSED) {
      throw new BadRequestException('Cannot update a dispensed prescription');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      Object.assign(prescription, {
        diagnosis: dto.diagnosis ?? prescription.diagnosis,
        icdCodes: dto.icdCodes ?? prescription.icdCodes,
        clinicalNotes: dto.clinicalNotes ?? prescription.clinicalNotes,
        specialInstructions: dto.specialInstructions ?? prescription.specialInstructions,
        labInvestigations: dto.labInvestigations ?? prescription.labInvestigations,
        radiologyInvestigations: dto.radiologyInvestigations ?? prescription.radiologyInvestigations,
      });
      await queryRunner.manager.save(Prescription, prescription);

      if (dto.medicines?.length) {
        await queryRunner.manager.delete(PrescriptionMedicine, { prescriptionId });
        const medicines = dto.medicines.map((m, idx) =>
          queryRunner.manager.create(PrescriptionMedicine, {
            ...m,
            prescriptionId,
            sortOrder: idx,
          }),
        );
        await queryRunner.manager.save(PrescriptionMedicine, medicines);
      }

      await queryRunner.commitTransaction();
      return prescription;
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw err;
    } finally {
      await queryRunner.release();
    }
  }

  async getPrescriptionBySession(
    sessionId: string,
  ): Promise<{ prescription: Prescription; medicines: PrescriptionMedicine[] }> {
    const prescription = await this.prescriptionRepo.findOne({ where: { sessionId } });
    if (!prescription) throw new NotFoundException('No prescription found for this session');

    const medicines = await this.medicineRepo.find({
      where: { prescriptionId: prescription.id },
      order: { sortOrder: 'ASC' },
    });
    return { prescription, medicines };
  }

  async getPrescriptionsByPatient(patientId: string): Promise<Prescription[]> {
    return this.prescriptionRepo.find({
      where: { patientId },
      order: { issuedAt: 'DESC' },
    });
  }

  async getPrescriptionsByDoctor(doctorId: string): Promise<Prescription[]> {
    return this.prescriptionRepo.find({
      where: { doctorId },
      order: { issuedAt: 'DESC' },
    });
  }

  async getPrescriptionWithMedicines(
    prescriptionId: string,
  ): Promise<{ prescription: Prescription; medicines: PrescriptionMedicine[] }> {
    const prescription = await this.prescriptionRepo.findOne({ where: { id: prescriptionId } });
    if (!prescription) throw new NotFoundException('Prescription not found');

    const medicines = await this.medicineRepo.find({
      where: { prescriptionId },
      order: { sortOrder: 'ASC' },
    });
    return { prescription, medicines };
  }

  // ─── Chat ─────────────────────────────────────────────────────────────────

  async sendChatMessage(
    dto: SendChatMessageDto,
    senderId: string,
    senderRole: SenderRole,
  ): Promise<ConsultationChatMessage> {
    const session = await this.findSessionOrFail(dto.sessionId);

    if (![SessionStatus.ACTIVE, SessionStatus.COMPLETED].includes(session.status)) {
      throw new BadRequestException(`Cannot send messages for session in status: ${session.status}`);
    }

    if (dto.messageType === MessageType.TEXT && !dto.content?.trim()) {
      throw new BadRequestException('Text messages must have content');
    }

    const message = this.chatRepo.create({
      sessionId: dto.sessionId,
      senderId,
      senderRole,
      messageType: dto.messageType,
      content: dto.content,
      fileUrl: dto.fileUrl,
      fileName: dto.fileName,
      fileMimeType: dto.fileMimeType,
      fileSize: dto.fileSize,
      metadata: dto.metadata,
    });

    const saved = await this.chatRepo.save(message);

    this.eventEmitter.emit('telemedicine.chat.message', {
      message: saved,
      sessionRef: session.sessionRef,
    });

    return saved;
  }

  async getChatHistory(
    sessionId: string,
    query: ChatQueryDto,
    requesterId: string,
  ): Promise<{ messages: ConsultationChatMessage[]; total: number }> {
    const session = await this.findSessionOrFail(sessionId);

    if (session.patientId !== requesterId && session.doctorId !== requesterId) {
      throw new ForbiddenException('Access denied to this session chat');
    }

    const qb = this.chatRepo
      .createQueryBuilder('msg')
      .where('msg.sessionId = :sessionId', { sessionId })
      .andWhere('msg.isDeleted = false')
      .orderBy('msg.createdAt', 'DESC')
      .skip(((query.page ?? 1) - 1) * (query.limit ?? 50))
      .take(query.limit ?? 50);

    if (query.before) {
      const pivot = await this.chatRepo.findOne({ where: { id: query.before } });
      if (pivot) {
        qb.andWhere('msg.createdAt < :pivot', { pivot: pivot.createdAt });
      }
    }

    const [messages, total] = await qb.getManyAndCount();
    return { messages: messages.reverse(), total };
  }

  async markMessagesAsRead(sessionId: string, readerId: string): Promise<void> {
    await this.chatRepo
      .createQueryBuilder()
      .update(ConsultationChatMessage)
      .set({ isRead: true, readAt: new Date() })
      .where('sessionId = :sessionId', { sessionId })
      .andWhere('senderId != :readerId', { readerId })
      .andWhere('isRead = false')
      .execute();
  }

  async deleteMessage(messageId: string, requesterId: string): Promise<void> {
    const message = await this.chatRepo.findOne({ where: { id: messageId } });
    if (!message) throw new NotFoundException('Message not found');
    if (message.senderId !== requesterId) {
      throw new ForbiddenException('Cannot delete another user\'s message');
    }
    message.isDeleted = true;
    await this.chatRepo.save(message);
  }

  // ─── Follow-up ────────────────────────────────────────────────────────────

  async scheduleFollowUp(
    sessionId: string,
    followUpDate: string,
    doctorId: string,
  ): Promise<TelemedicineSession> {
    const session = await this.findSessionOrFail(sessionId);

    if (session.doctorId !== doctorId) {
      throw new ForbiddenException('Only the session doctor can schedule follow-ups');
    }

    session.followUpRequired = true;
    session.followUpDate = new Date(followUpDate);
    const saved = await this.sessionRepo.save(session);

    this.eventEmitter.emit('telemedicine.followup.scheduled', {
      session: saved,
      followUpDate: session.followUpDate,
    });

    return saved;
  }

  // ─── Dashboard ────────────────────────────────────────────────────────────

  async getDoctorDashboard(doctorId: string): Promise<Record<string, any>> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todaySessions, totalSessions, pendingFollowUps] = await Promise.all([
      this.sessionRepo.count({
        where: { doctorId, scheduledAt: Between(today, tomorrow) },
      }),
      this.sessionRepo.count({ where: { doctorId } }),
      this.sessionRepo.count({
        where: { doctorId, followUpRequired: true, status: SessionStatus.COMPLETED },
      }),
    ]);

    const completedSessions = await this.sessionRepo.find({
      where: { doctorId, status: SessionStatus.COMPLETED },
      select: ['durationSeconds'],
    });

    const avgDuration = completedSessions.length
      ? Math.round(
          completedSessions.reduce((s, c) => s + (c.durationSeconds ?? 0), 0) /
            completedSessions.length,
        )
      : 0;

    return {
      todaySessions,
      totalSessions,
      pendingFollowUps,
      avgDurationSeconds: avgDuration,
      avgDurationMinutes: Math.floor(avgDuration / 60),
    };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async findSessionOrFail(sessionId: string): Promise<TelemedicineSession> {
    const session = await this.sessionRepo.findOne({ where: { id: sessionId } });
    if (!session) throw new NotFoundException(`Session ${sessionId} not found`);
    return session;
  }

  private async postSystemMessage(sessionId: string, content: string): Promise<void> {
    const message = this.chatRepo.create({
      sessionId,
      senderId: 'system',
      senderRole: SenderRole.SYSTEM,
      messageType: MessageType.SYSTEM,
      content,
    });
    await this.chatRepo.save(message);
  }
}