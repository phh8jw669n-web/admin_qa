import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { trimString } from '../../../common/utils/string.util';

export class CreateFeedbackDto {
  @ApiProperty({
    minimum: 1,
    maximum: 5,
    example: 5,
    description: 'Required. Whole number from 1 to 5.',
  })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({
    example: 'The instructions were clear.',
    description: 'Optional. Leave it out when there is no comment.',
    maxLength: 2000,
  })
  @IsOptional()
  @Transform(({ value }) => {
    const trimmed = trimString(value);
    return trimmed === '' ? undefined : trimmed;
  })
  @IsString()
  @MaxLength(2000)
  comment?: string;
}
