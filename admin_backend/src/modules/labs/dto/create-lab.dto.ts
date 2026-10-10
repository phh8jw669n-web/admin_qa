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

export class CreateLabDto {
  @IsUUID()
  zoneId!: string;

  @IsUUID()
  regionId!: string;

  @IsUUID()
  centreId!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  name!: string;

  @IsInt()
  @Min(0)
  sessionCount!: number;

  @IsInt()
  @Min(0)
  seats!: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
