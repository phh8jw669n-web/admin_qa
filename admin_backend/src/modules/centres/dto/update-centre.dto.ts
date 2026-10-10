import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { INT4_MAX } from '../../../common/constants/validation.constants';
import { trimLowercase, trimString } from '../../../common/utils/string.util';

function trimCode(value: unknown): unknown {
  if (typeof value === 'number') {
    return String(value);
  }

  return trimString(value);
}

export class UpdateCentreDto {
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsUUID()
  regionId?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  name?: string;

  @IsOptional()
  @Transform(({ value }) => trimCode(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  address?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  landmark?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  coordinatorName?: string;

  @IsOptional()
  @Transform(({ value }) => trimLowercase(value))
  @IsEmail()
  @MaxLength(255)
  coordinatorEmail?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  primaryPhoneNo?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(20)
  secondaryPhoneNo?: string | null;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(INT4_MAX)
  labCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(INT4_MAX)
  sessionCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(INT4_MAX)
  seats?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
