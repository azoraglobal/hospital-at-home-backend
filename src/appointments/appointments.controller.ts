import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import {
  BookAppointmentDto,
  RescheduleAppointmentDto,
  AppointmentQueryDto,
} from './dto/appointment.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/interfaces/jwt-payload.interface';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  // ── Patient ────────────────────────────────────

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.PATIENT)
  book(@Request() req, @Body() dto: BookAppointmentDto) {
    return this.appointmentsService.book(req.user.id, dto);
  }

  @Get('my')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PATIENT)
  getMyAppointments(@Request() req, @Query() query: AppointmentQueryDto) {
    return this.appointmentsService.getPatientAppointments(req.user.id, query);
  }

  @Patch(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PATIENT)
  cancelAsPatient(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body('reason') reason: string,
  ) {
    return this.appointmentsService.cancelAppointment(id, req.user.id, reason, 'patient');
  }

  @Patch(':id/reschedule')
  @UseGuards(RolesGuard)
  @Roles(UserRole.PATIENT)
  reschedule(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body() dto: RescheduleAppointmentDto,
  ) {
    return this.appointmentsService.reschedule(id, req.user.id, dto);
  }

  // ── Doctor ─────────────────────────────────────

  @Get('doctor')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DOCTOR)
  getDoctorAppointments(@Request() req, @Query() query: AppointmentQueryDto) {
    return this.appointmentsService.getDoctorAppointments(req.user.id, query);
  }

  @Patch(':id/confirm')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DOCTOR)
  confirm(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.appointmentsService.confirmAppointment(id, req.user.id);
  }

  @Patch(':id/complete')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DOCTOR)
  complete(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body('notes') notes?: string,
  ) {
    return this.appointmentsService.completeAppointment(id, req.user.id, notes);
  }

  @Patch(':id/cancel-doctor')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DOCTOR)
  cancelAsDoctor(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body('reason') reason: string,
  ) {
    return this.appointmentsService.cancelAppointment(id, req.user.id, reason, 'doctor');
  }

  // ── Shared ─────────────────────────────────────

  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string, @Request() req) {
    return this.appointmentsService.getAppointmentById(id, req.user.id);
  }
}