import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { INT4_MAX } from '../../../common/constants/validation.constants';
import { trimString } from '../../../common/utils/string.util';

export class CreateCategoryDto {
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsInt()
  @Min(0)
  @Max(INT4_MAX)
  ranking!: number;

  @IsOptional()
  @IsUUID()
  languageId?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
