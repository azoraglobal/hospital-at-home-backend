import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, DoctorReplyDto } from './dto/review.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../auth/interfaces/jwt-payload.interface';

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @UseGuards(RolesGuard)
  @Roles(UserRole.PATIENT)
  createReview(@Request() req, @Body() dto: CreateReviewDto) {
    return this.reviewsService.createReview(req.user.id, dto);
  }

  @Get('doctor/:doctorId')
  getDoctorReviews(
    @Param('doctorId', ParseUUIDPipe) doctorId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ) {
    return this.reviewsService.getDoctorReviews(doctorId, +page, +limit);
  }

  @Post(':id/reply')
  @UseGuards(RolesGuard)
  @Roles(UserRole.DOCTOR)
  reply(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req,
    @Body() dto: DoctorReplyDto,
  ) {
    return this.reviewsService.addDoctorReply(id, req.user.id, dto);
  }

  @Patch(':id/flag')
  flagReview(@Param('id', ParseUUIDPipe) id: string) {
    return this.reviewsService.flagReview(id);
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  approveReview(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('approved') approved: boolean,
  ) {
    return this.reviewsService.approveReview(id, approved);
  }
}