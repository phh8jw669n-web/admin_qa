import { ApiProperty } from '@nestjs/swagger';

export class FeedbackResponseDataDto {
  @ApiProperty({ format: 'uuid' })
  id!: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Logged-in candidate. Taken from the access token.',
  })
  studentId!: string;

  @ApiProperty({
    format: 'uuid',
    description: 'Company from the access token.',
  })
  companyId!: string;

  @ApiProperty({ format: 'uuid' })
  testId!: string;

  @ApiProperty({ minimum: 1, maximum: 5, example: 5 })
  rating!: number;

  @ApiProperty({ nullable: true, example: 'The instructions were clear.' })
  comment!: string | null;

  @ApiProperty({ example: '2026-10-09T03:00:00.000Z' })
  createdAt!: string;

  @ApiProperty({ example: '2026-10-09T03:00:00.000Z' })
  updatedAt!: string;
}

export class FeedbackResponseDto {
  @ApiProperty({ example: true })
  success!: boolean;

  @ApiProperty({ example: 'Feedback submitted successfully' })
  message!: string;

  @ApiProperty({ type: FeedbackResponseDataDto })
  data!: FeedbackResponseDataDto;
}
