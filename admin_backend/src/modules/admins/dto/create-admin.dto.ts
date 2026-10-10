import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { trimLowercase, trimString } from '../../../common/utils/string.util';
import { AdminRole } from '../enums/admin-role.enum';

export class CreateAdminDto {
  @IsUUID()
  companyId!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  firstName!: string;

  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  lastName!: string;

  @IsEnum(AdminRole)
  role!: AdminRole;

  @IsOptional()
  @IsBoolean()
  isMfaEnabled?: boolean;

  @Transform(({ value }) => trimLowercase(value))
  @IsEmail()
  @MaxLength(250)
  email!: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(5)
  countryCode?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(15)
  mobileNumber?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsString()
  profileImageUrl?: string;
}
