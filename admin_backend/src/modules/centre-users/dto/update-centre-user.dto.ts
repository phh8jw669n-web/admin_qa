import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { trimLowercase, trimString } from '../../../common/utils/string.util';

export class UpdateCentreUserDto {
  @IsOptional()
  @IsUUID()
  centreId?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(250)
  name?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimLowercase(value))
  @IsEmail()
  @MaxLength(250)
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  enableMail?: boolean;
}
