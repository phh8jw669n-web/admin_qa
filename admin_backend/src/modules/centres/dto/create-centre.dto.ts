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

export class CreateCentreDto {
  @IsUUID()
  zoneId!: string;

  @IsUUID()
  regionId!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  name!: string;

  @Transform(({ value }) => trimCode(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  code!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  address!: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  landmark?: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  coordinatorName!: string;

  @Transform(({ value }) => trimLowercase(value))
  @IsEmail()
  @MaxLength(255)
  coordinatorEmail!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  primaryPhoneNo!: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(20)
  secondaryPhoneNo?: string;

  @IsInt()
  @Min(0)
  @Max(INT4_MAX)
  labCount!: number;

  @IsInt()
  @Min(0)
  @Max(INT4_MAX)
  sessionCount!: number;

  @IsInt()
  @Min(0)
  @Max(INT4_MAX)
  seats!: number;

  @Type(() => Number)
  @IsLatitude()
  latitude!: number;

  @Type(() => Number)
  @IsLongitude()
  longitude!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
