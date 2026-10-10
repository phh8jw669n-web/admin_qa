import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { trimString } from '../../../common/utils/string.util';

export class UpdateLabDto {
  @IsOptional()
  @IsUUID()
  zoneId?: string;

  @IsOptional()
  @IsUUID()
  regionId?: string;

  @IsOptional()
  @IsUUID()
  centreId?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sessionCount?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  seats?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
