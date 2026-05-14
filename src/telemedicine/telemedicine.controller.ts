import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  Request,
} from '@nestjs/common';
import { TelemedicineService } from './telemedicine.service';
import { Roles } from '../auth/decorators/roles.decorator';
import { SenderRole } from './entities/consultation-chat-message.entity';
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

@Controller('telemedicine')
export class TelemedicineController {
  constructor(private readonly telemedicineService: TelemedicineService) {}

  // ─── Sessions ─────────────────────────────────────────────────────────────

  @Post('sessions')
  async initiateSession(@Body() dto: InitiateSessionDto, @Request() req) {
    const { id: userId, role } = req.user;
    return this.telemedicineService.initiateSession(dto, userId, role);
  }

  @Post('sessions/:id/join')
  async joinSession(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Request() req,
  ) {
    const { id: userId, role } = req.user;
    return this.telemedicineService.joinSession(sessionId, userId, role);
  }

  @Post('sessions/:id/end')
  @Roles('doctor' as any)
  async endSession(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Body() dto: EndSessionDto,
    @Request() req,
  ) {
    return this.telemedicineService.endSession(sessionId, dto, req.user.id);
  }

  @Post('sessions/:id/token/refresh')
  async refreshToken(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Request() req,
  ) {
    const { id: userId, role } = req.user;
    return this.telemedicineService.refreshAgoraToken(sessionId, userId, role);
  }

  @Patch('sessions/:id/notes')
  @Roles('doctor' as any)
  async updateNotes(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Body() dto: UpdateSessionNotesDto,
    @Request() req,
  ) {
    return this.telemedicineService.updateSessionNotes(sessionId, dto, req.user.id);
  }

  @Patch('sessions/:id/cancel')
  async cancelSession(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Body() dto: CancelSessionDto,
    @Request() req,
  ) {
    return this.telemedicineService.cancelSession(sessionId, dto, req.user.id);
  }

  @Patch('sessions/:id/follow-up')
  @Roles('doctor' as any)
  async scheduleFollowUp(
    @Param('id', ParseUUIDPipe) sessionId: string,
    @Body('followUpDate') followUpDate: string,
    @Request() req,
  ) {
    return this.telemedicineService.scheduleFollowUp(sessionId, followUpDate, req.user.id);
  }

  @Get('sessions/doctor/my')
  @Roles('doctor' as any)
  async getDoctorSessions(@Request() req, @Query() query: SessionQueryDto) {
    return this.telemedicineService.getSessionsByDoctor(req.user.id, query);
  }

  @Get('sessions/patient/my')
  @Roles('patient' as any)
  async getPatientSessions(@Request() req, @Query() query: SessionQueryDto) {
    return this.telemedicineService.getSessionsByPatient(req.user.id, query);
  }

  @Get('sessions/:id')
  async getSession(@Param('id', ParseUUIDPipe) sessionId: string) {
    return this.telemedicineService.getSessionById(sessionId);
  }

  @Get('dashboard/doctor')
  @Roles('doctor' as any)
  async getDoctorDashboard(@Request() req) {
    return this.telemedicineService.getDoctorDashboard(req.user.id);
  }

  // ─── Recording ────────────────────────────────────────────────────────────

  @Post('recording/start')
  @Roles('doctor' as any)
  async startRecording(@Body() dto: StartRecordingDto, @Request() req) {
    return this.telemedicineService.startRecording(dto, req.user.id);
  }

  @Post('recording/stop')
  @Roles('doctor' as any)
  async stopRecording(@Body() dto: StopRecordingDto, @Request() req) {
    return this.telemedicineService.stopRecording(dto, req.user.id);
  }

  // ─── Prescriptions ────────────────────────────────────────────────────────

  @Post('prescriptions')
  @Roles('doctor' as any)
  async createPrescription(@Body() dto: CreatePrescriptionDto, @Request() req) {
    return this.telemedicineService.createPrescription(dto, req.user.id);
  }

  @Put('prescriptions/:id')
  @Roles('doctor' as any)
  async updatePrescription(
    @Param('id', ParseUUIDPipe) prescriptionId: string,
    @Body() dto: UpdatePrescriptionDto,
    @Request() req,
  ) {
    return this.telemedicineService.updatePrescription(prescriptionId, dto, req.user.id);
  }

  @Get('prescriptions/patient/my')
  @Roles('patient' as any)
  async getMyPrescriptions(@Request() req) {
    return this.telemedicineService.getPrescriptionsByPatient(req.user.id);
  }

  @Get('prescriptions/doctor/my')
  @Roles('doctor' as any)
  async getDoctorPrescriptions(@Request() req) {
    return this.telemedicineService.getPrescriptionsByDoctor(req.user.id);
  }

  @Get('prescriptions/session/:sessionId')
  async getPrescriptionBySession(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.telemedicineService.getPrescriptionBySession(sessionId);
  }

  @Get('prescriptions/:id')
  async getPrescription(@Param('id', ParseUUIDPipe) prescriptionId: string) {
    return this.telemedicineService.getPrescriptionWithMedicines(prescriptionId);
  }

  // ─── Chat ─────────────────────────────────────────────────────────────────

  @Post('chat')
  async sendMessage(@Body() dto: SendChatMessageDto, @Request() req) {
    const senderRole = req.user.role === 'doctor' ? SenderRole.DOCTOR : SenderRole.PATIENT;
    return this.telemedicineService.sendChatMessage(dto, req.user.id, senderRole);
  }

  @Get('chat/:sessionId')
  async getChatHistory(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Query() query: ChatQueryDto,
    @Request() req,
  ) {
    return this.telemedicineService.getChatHistory(sessionId, query, req.user.id);
  }

  @Patch('chat/:sessionId/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  async markAsRead(
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Request() req,
  ) {
    return this.telemedicineService.markMessagesAsRead(sessionId, req.user.id);
  }

  @Delete('chat/message/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteMessage(
    @Param('id', ParseUUIDPipe) messageId: string,
    @Request() req,
  ) {
    return this.telemedicineService.deleteMessage(messageId, req.user.id);
  }
}