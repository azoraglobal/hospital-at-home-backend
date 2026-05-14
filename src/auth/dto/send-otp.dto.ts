import { IsString, Matches } from 'class-validator';

export class SendOtpDto {
  @IsString()
  @Matches(/^\+92[0-9]{10}$/, {
    message: 'Phone must be a valid Pakistani number. Format: +923XXXXXXXXX',
  })
  phone: string;
}