import {
  IsUUID,
  IsNumber,
  IsString,
  IsBoolean,
  IsOptional,
  Min,
  Max,
} from 'class-validator';

export class CreateReviewDto {
  @IsUUID()
  appointmentId: string;

  @IsNumber()
  @Min(1)
  @Max(5)
  overallRating: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  punctualityRating?: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  behaviorRating?: number;

  @IsNumber()
  @Min(1)
  @Max(5)
  @IsOptional()
  knowledgeRating?: number;

  @IsString()
  @IsOptional()
  comment?: string;

  @IsBoolean()
  @IsOptional()
  isAnonymous?: boolean;
}

export class DoctorReplyDto {
  @IsString()
  reply: string;
}