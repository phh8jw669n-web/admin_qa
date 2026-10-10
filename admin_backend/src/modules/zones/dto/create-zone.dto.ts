import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { trimString } from '../../../common/utils/string.util';

export class CreateZoneDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  name!: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
