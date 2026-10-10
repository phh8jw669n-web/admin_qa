import { Transform } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { parseQueryBoolean } from '../../../common/utils/boolean.util';
import { trimString } from '../../../common/utils/string.util';

export class QueryTemplateDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  ranking?: number;

  @IsOptional()
  @Transform(({ obj, value }) => parseQueryBoolean(obj.isActive ?? value))
  @IsBoolean()
  isActive?: boolean;
}
