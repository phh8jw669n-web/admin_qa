import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  Min,
  Matches,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import {
  GST_NO_PATTERN,
  PAN_NO_PATTERN,
} from '../constants/companies.constants';
import { CompanyPlan, CompanyStatus } from '../enums/company.enum';

export class UpdateCompanyDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  name?: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsOptional()
  @IsString()
  workspaceUrl?: string;

  @IsOptional()
  @IsString()
  industry?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1800)
  @Max(new Date().getUTCFullYear())
  yearFounded?: number | null;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  addressLine1?: string;

  @IsOptional()
  @IsString()
  addressLine2?: string | null;

  @IsOptional()
  @IsString()
  pinCode?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  state?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  fax?: string | null;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  website?: string | null;

  @IsOptional()
  @IsString()
  serviceTaxNo?: string | null;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(10)
  @Matches(PAN_NO_PATTERN, {
    message:
      'panNo must be 5 letters, followed by 4 digits, followed by 1 letter',
  })
  panNo?: string | null;

  @IsOptional()
  @IsString()
  vatRegistrationNo?: string | null;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(15)
  @Matches(GST_NO_PATTERN, {
    message: 'gstNo must be a valid 15-character GST number',
  })
  gstNo?: string;

  @IsOptional()
  @IsString()
  companyLogo?: string | null;

  @IsOptional()
  @IsString()
  favicon?: string | null;

  @IsOptional()
  @IsString()
  primaryColor?: string | null;

  @IsOptional()
  @IsString()
  secondaryColor?: string | null;

  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;

  @IsOptional()
  @IsEnum(CompanyPlan)
  plan?: CompanyPlan;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsISO8601()
  planEndsAt?: string | null;
}
