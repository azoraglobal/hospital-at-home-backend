import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto, SearchDoctorsDto } from './dto/update-doctor.dto';
import { BulkSetAvailabilityDto, BlockDateDto, GetSlotsQueryDto } from './dto/availability.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Public } from '../auth/decorators/public.decorator';
import { UserRole } from '../auth/interfaces/jwt-payload.interface';
import { DocumentType } from './entities/doctor-document.entity';
import { DoctorStatus } from './entities/doctor.entity';

@Controller('doctors')
@UseGuards(JwtAuthGuard)
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  // ── Specializations ────────────────────────────

  @Public()
  @Get('specializations')
  getSpecializations() {
    return this.doctorsService.getAllSpecializations();
  }

  @Post('specializations')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  createSpecialization(
    @Body() body: { name: string; nameUrdu?: string; description?: string },
  ) {
    return this.doctorsService.createSpecialization(body.name, body.nameUrdu, body.description);
  }

  // ── Doctor Profile (self) ──────────────────────

  @Post('profile')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DOCTOR)
  createProfile(@Request() req, @Body() dto: CreateDoctorDto) {
    return this.doctorsService.createProfile(req.user.id, dto);
  }

  @Get('profile/me')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DOCTOR)
  getMyProfile(@Request() req) {
    return this.doctorsService.getMyProfile(req.user.id);
  }

  @Put('profile/me')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DOCTOR)
  updateProfile(@Request() req, @Body() dto: UpdateDoctorDto) {
    return this.doctorsService.updateProfile(req.user.id, dto);
  }

  @Patch('profile/me/toggle-available')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DOCTOR)
  toggleAvailable(@Request() req) {
    return this.doctorsService.toggleAvailableNow(req.user.id);
  }

  // ── PMDC ──────────────────────────────────────

  @Post('profile/me/pmdc')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DOCTOR)
  submitPmdc(@Request() req, @Body('pmdcNumber') pmdcNumber: string) {
    return this.doctorsService.submitPmdcVerification(req.user.id, pmdcNumber);
  }

  @Patch(':id/pmdc/verify')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  adminVerifyPmdc(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { approved: boolean; reason?: string },
  ) {
    return this.doctorsService.adminVerifyPmdc(id, body.approved, body.reason);
  }

  // ── Documents ─────────────────────────────────

  @Get('profile/me/documents')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DOCTOR)
  getMyDocuments(@Request() req) {
    return this.doctorsService
      .getMyProfile(req.user.id)
      .then((d) => this.doctorsService.getDoctorDocuments(d.id));
  }

  // ── Availability ──────────────────────────────

  @Post('profile/me/availability')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DOCTOR)
  setAvailability(@Request() req, @Body() dto: BulkSetAvailabilityDto) {
    return this.doctorsService.setAvailability(req.user.id, dto);
  }

  @Get('profile/me/availability')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DOCTOR)
  getMyAvailability(@Request() req) {
    return this.doctorsService.getMyAvailability(req.user.id);
  }

  @Post('profile/me/availability/block')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DOCTOR)
  blockDate(@Request() req, @Body() dto: BlockDateDto) {
    return this.doctorsService.blockDate(req.user.id, dto);
  }

  @Delete('profile/me/availability/block/:date')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DOCTOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  unblockDate(@Request() req, @Param('date') date: string) {
    return this.doctorsService.unblockDate(req.user.id, date);
  }

  // ── Public endpoints ──────────────────────────

  @Public()
  @Get()
  searchDoctors(@Query() query: SearchDoctorsDto) {
    return this.doctorsService.searchDoctors(query);
  }

  @Public()
  @Get(':id')
  getDoctorProfile(@Param('id', ParseUUIDPipe) id: string) {
    return this.doctorsService.getProfileById(id);
  }

  @Public()
  @Get(':id/slots')
  getAvailableSlots(
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: GetSlotsQueryDto,
  ) {
    return this.doctorsService.getAvailableSlots(id, query.date);
  }

  // ── Admin ─────────────────────────────────────

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  updateDoctorStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('status') status: DoctorStatus,
  ) {
    return this.doctorsService.adminUpdateStatus(id, status);
  }
}