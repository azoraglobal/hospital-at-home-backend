import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { DoctorReview } from './entities/doctor-review.entity';
import { CreateReviewDto, DoctorReplyDto } from './dto/review.dto';
import { Appointment, AppointmentStatus } from '../appointments/entities/appointment.entity';
import { Doctor } from '../doctors/entities/doctor.entity';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(DoctorReview)
    private readonly reviewRepo: Repository<DoctorReview>,
    @InjectRepository(Appointment)
    private readonly appointmentRepo: Repository<Appointment>,
    @InjectRepository(Doctor)
    private readonly doctorRepo: Repository<Doctor>,
  ) {}

  async createReview(patientId: string, dto: CreateReviewDto): Promise<DoctorReview> {
    const appointment = await this.appointmentRepo.findOne({
      where: { id: dto.appointmentId, patientId, status: AppointmentStatus.COMPLETED },
    });
    if (!appointment) {
      throw new NotFoundException('Completed appointment not found');
    }

    const existing = await this.reviewRepo.findOne({
      where: { appointmentId: dto.appointmentId },
    });
    if (existing) throw new ConflictException('Review already submitted for this appointment');

    if (dto.overallRating < 1 || dto.overallRating > 5) {
      throw new BadRequestException('Rating must be between 1 and 5');
    }

    const review = this.reviewRepo.create({
      ...dto,
      patientId,
      doctorId: appointment.doctorId,
    });
    const saved = await this.reviewRepo.save(review);

    await this.recalculateDoctorRating(appointment.doctorId);
    return saved;
  }

  async getDoctorReviews(
    doctorId: string,
    page = 1,
    limit = 10,
  ): Promise<{ data: DoctorReview[]; total: number; average: number }> {
    const [data, total] = await this.reviewRepo.findAndCount({
      where: { doctorId, isApproved: true },
      relations: ['patient'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const doctor = await this.doctorRepo.findOne({ where: { id: doctorId } });
    return { data, total, average: Number(doctor?.averageRating || 0) };
  }

  async addDoctorReply(
    reviewId: string,
    doctorUserId: string,
    dto: DoctorReplyDto,
  ): Promise<DoctorReview> {
    const review = await this.reviewRepo.findOne({
      where: { id: reviewId },
      relations: ['doctor'],
    });
    if (!review) throw new NotFoundException('Review not found');
    if (review.doctor.userId !== doctorUserId) throw new ForbiddenException('Not your review');
    if (review.doctorReply) throw new BadRequestException('Reply already added');

    review.doctorReply = dto.reply;
    review.repliedAt = new Date();
    return this.reviewRepo.save(review);
  }

  async flagReview(reviewId: string): Promise<void> {
    await this.reviewRepo.update(reviewId, { isFlagged: true });
  }

  async approveReview(reviewId: string, approved: boolean): Promise<DoctorReview> {
    const review = await this.reviewRepo.findOne({ where: { id: reviewId } });
    if (!review) throw new NotFoundException('Review not found');
    review.isApproved = approved;
    const saved = await this.reviewRepo.save(review);
    await this.recalculateDoctorRating(review.doctorId);
    return saved;
  }

  private async recalculateDoctorRating(doctorId: string): Promise<void> {
    const result = await this.reviewRepo
      .createQueryBuilder('r')
      .select('AVG(r.overallRating)', 'avg')
      .addSelect('COUNT(r.id)', 'count')
      .where('r.doctorId = :doctorId', { doctorId })
      .andWhere('r.isApproved = true')
      .getRawOne();

    await this.doctorRepo.update(doctorId, {
      averageRating: Math.round(parseFloat(result.avg || '0') * 100) / 100,
      totalReviews: parseInt(result.count || '0'),
    });
  }
}