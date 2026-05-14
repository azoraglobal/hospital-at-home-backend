import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';

import { PatientsService } from './patients.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { UserRole } from '../auth/interfaces/jwt-payload.interface';
import { CreatePatientProfileDto } from './dto/create-patient-profile.dto';
import { UpdatePatientProfileDto } from './dto/update.dto';
import {
  CreateFamilyMemberDto,
  CreateMedicalHistoryDto,
  CreateAllergyDto,
  CreateVaccinationDto,
} from './dto/sub-resources.dto';
import {
  UpdateFamilyMemberDto,
  UpdateMedicalHistoryDto,
  UpdateAllergyDto,
  UpdateVaccinationDto,
} from './dto/update.dto';

@ApiTags('Patient Profiles')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('patients')
export class PatientsController {
  constructor(private readonly patientsService: PatientsService) {}

  // ─── Profile ──────────────────────────────────────────────────────────────

  @Post('profile')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Create patient profile' })
  createProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: CreatePatientProfileDto,
  ) {
    return this.patientsService.createProfile(userId, dto);
  }

  @Get('profile/me')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Get my complete patient profile' })
  getMyProfile(@CurrentUser('id') userId: string) {
    return this.patientsService.getMyProfile(userId);
  }

  @Patch('profile/me')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Update my patient profile' })
  updateProfile(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdatePatientProfileDto,
  ) {
    return this.patientsService.updateProfile(userId, dto);
  }

  @Delete('profile/me')
  @Roles(UserRole.PATIENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Deactivate my patient profile' })
  deactivateProfile(@CurrentUser('id') userId: string) {
    return this.patientsService.deactivateProfile(userId);
  }

  @Get()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: '[Admin] List all patient profiles' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  getAllProfiles(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.patientsService.getAllProfiles(+page, +limit);
  }

  @Get(':profileId')
  @Roles(UserRole.ADMIN, UserRole.DOCTOR)
  @ApiOperation({ summary: '[Admin/Doctor] Get patient profile by ID' })
  getProfileById(@Param('profileId', ParseUUIDPipe) profileId: string) {
    return this.patientsService.getProfileById(profileId);
  }

  // ─── Family Members ────────────────────────────────────────────────────────

  @Post('family-members')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Add a family member' })
  addFamilyMember(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateFamilyMemberDto,
  ) {
    return this.patientsService.addFamilyMember(userId, dto);
  }

  @Get('family-members/list')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Get my family members' })
  getFamilyMembers(@CurrentUser('id') userId: string) {
    return this.patientsService.getFamilyMembers(userId);
  }

  @Patch('family-members/:memberId')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Update a family member' })
  updateFamilyMember(
    @CurrentUser('id') userId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
    @Body() dto: UpdateFamilyMemberDto,
  ) {
    return this.patientsService.updateFamilyMember(userId, memberId, dto);
  }

  @Delete('family-members/:memberId')
  @Roles(UserRole.PATIENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove a family member' })
  deleteFamilyMember(
    @CurrentUser('id') userId: string,
    @Param('memberId', ParseUUIDPipe) memberId: string,
  ) {
    return this.patientsService.deleteFamilyMember(userId, memberId);
  }

  // ─── Medical History ───────────────────────────────────────────────────────

  @Post('medical-history')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Add medical history record' })
  addMedicalHistory(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateMedicalHistoryDto,
  ) {
    return this.patientsService.addMedicalHistory(userId, dto);
  }

  @Get('medical-history/list')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Get my medical history' })
  getMedicalHistories(@CurrentUser('id') userId: string) {
    return this.patientsService.getMedicalHistories(userId);
  }

  @Patch('medical-history/:recordId')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Update a medical history record' })
  updateMedicalHistory(
    @CurrentUser('id') userId: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
    @Body() dto: UpdateMedicalHistoryDto,
  ) {
    return this.patientsService.updateMedicalHistory(userId, recordId, dto);
  }

  @Delete('medical-history/:recordId')
  @Roles(UserRole.PATIENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a medical history record' })
  deleteMedicalHistory(
    @CurrentUser('id') userId: string,
    @Param('recordId', ParseUUIDPipe) recordId: string,
  ) {
    return this.patientsService.deleteMedicalHistory(userId, recordId);
  }

  // ─── Allergies ─────────────────────────────────────────────────────────────

  @Post('allergies')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Add an allergy' })
  addAllergy(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateAllergyDto,
  ) {
    return this.patientsService.addAllergy(userId, dto);
  }

  @Get('allergies/list')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Get my allergies' })
  getAllergies(@CurrentUser('id') userId: string) {
    return this.patientsService.getAllergies(userId);
  }

  @Patch('allergies/:allergyId')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Update an allergy record' })
  updateAllergy(
    @CurrentUser('id') userId: string,
    @Param('allergyId', ParseUUIDPipe) allergyId: string,
    @Body() dto: UpdateAllergyDto,
  ) {
    return this.patientsService.updateAllergy(userId, allergyId, dto);
  }

  @Delete('allergies/:allergyId')
  @Roles(UserRole.PATIENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete an allergy record' })
  deleteAllergy(
    @CurrentUser('id') userId: string,
    @Param('allergyId', ParseUUIDPipe) allergyId: string,
  ) {
    return this.patientsService.deleteAllergy(userId, allergyId);
  }

  // ─── Vaccinations ──────────────────────────────────────────────────────────

  @Post('vaccinations')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Add a vaccination record' })
  addVaccination(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateVaccinationDto,
  ) {
    return this.patientsService.addVaccination(userId, dto);
  }

  @Get('vaccinations/list')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Get my vaccination records' })
  getVaccinations(@CurrentUser('id') userId: string) {
    return this.patientsService.getVaccinations(userId);
  }

  @Patch('vaccinations/:vaccId')
  @Roles(UserRole.PATIENT)
  @ApiOperation({ summary: 'Update a vaccination record' })
  updateVaccination(
    @CurrentUser('id') userId: string,
    @Param('vaccId', ParseUUIDPipe) vaccId: string,
    @Body() dto: UpdateVaccinationDto,
  ) {
    return this.patientsService.updateVaccination(userId, vaccId, dto);
  }

  @Delete('vaccinations/:vaccId')
  @Roles(UserRole.PATIENT)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a vaccination record' })
  deleteVaccination(
    @CurrentUser('id') userId: string,
    @Param('vaccId', ParseUUIDPipe) vaccId: string,
  ) {
    return this.patientsService.deleteVaccination(userId, vaccId);
  }
}