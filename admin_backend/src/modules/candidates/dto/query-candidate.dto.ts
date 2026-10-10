import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { parseQueryBoolean } from '../../../common/utils/boolean.util';
import { trimString } from '../../../common/utils/string.util';
import { CandidateGender, PaymentStatus } from '../enums/candidate.enum';

export class QueryCandidateDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  name?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  email?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  enrollmentNumber?: string;

  @IsOptional()
  @IsUUID()
  groupId?: string;

  @IsOptional()
  @IsEnum(CandidateGender)
  gender?: CandidateGender;

  @IsOptional()
  @IsEnum(PaymentStatus)
  paymentStatus?: PaymentStatus;

  @IsOptional()
  @Transform(({ obj, value }) => parseQueryBoolean(obj.isEnroll ?? value))
  @IsBoolean()
  isEnroll?: boolean;

  @IsOptional()
  @Transform(({ obj, value }) => parseQueryBoolean(obj.isActive ?? value))
  @IsBoolean()
  isActive?: boolean;
}
