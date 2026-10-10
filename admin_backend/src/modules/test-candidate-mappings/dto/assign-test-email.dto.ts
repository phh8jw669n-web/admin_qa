import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsEmail,
  IsOptional,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { parseCommaSeparated } from '../../../common/utils/string.util';

export class AssignTestEmailDto {
  @IsUUID()
  testId!: string;

  @Transform(({ value }) =>
    typeof value === 'string'
      ? [
          ...new Set(
            parseCommaSeparated(value).map((email) => email.toLowerCase()),
          ),
        ]
      : value,
  )
  @IsArray()
  @ArrayNotEmpty()
  @IsEmail({}, { each: true })
  @MaxLength(255, { each: true })
  email!: string[];

  @IsOptional()
  @IsUUID()
  groupId?: string;
}
