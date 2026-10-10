import { Transform } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDateString,
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
import {
  CandidateGender,
  MediumOfExam,
  PaymentStatus,
} from '../enums/candidate.enum';

export class UpdateCandidateDto {
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  enrollmentNumber?: string;

  @IsOptional()
  @Transform(({ value }) => trimLowercase(value))
  @IsEmail()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  mobile?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(20)
  secondaryMobile?: string | null;

  @IsOptional()
  @IsEnum(CandidateGender)
  gender?: CandidateGender;

  @IsOptional()
  @IsBoolean()
  hasDisability?: boolean;

  @IsOptional()
  @IsDateString({ strict: true })
  dateOfBirth?: string | null;

  @IsOptional()
  @IsDateString({ strict: true })
  dateOfRegistration?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(255)
  parentName?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimLowercase(value))
  @IsEmail()
  @MaxLength(255)
  parentEmail?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(20)
  parentMobile?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  country?: string;

  @IsOptional()
  @IsBoolean()
  isMailEnabled?: boolean;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  state?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  city?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  address?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  pincode?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  @MaxLength(255)
  className?: string | null;

  @IsOptional()
  @IsEnum(MediumOfExam)
  mediumOfExam?: MediumOfExam | null;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  preferredLocation?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  extra1?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  extra2?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  extra3?: string | null;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  extra4?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  groupIds?: string[];

  @IsOptional()
  @IsBoolean()
  isEnroll?: boolean;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
