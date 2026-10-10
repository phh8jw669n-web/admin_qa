import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { parseQueryBoolean } from '../../../common/utils/boolean.util';
import { trimString } from '../../../common/utils/string.util';
import { CompanyPlan } from '../enums/company.enum';

export class QueryCompanyDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  name?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  city?: string;

  @IsOptional()
  @Transform(({ obj, value }) => parseQueryBoolean(obj.isActive ?? value))
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsEnum(CompanyPlan)
  plan?: CompanyPlan;
}
