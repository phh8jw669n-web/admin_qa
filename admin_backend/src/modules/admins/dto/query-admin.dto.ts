import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { parseQueryBoolean } from '../../../common/utils/boolean.util';
import { trimString } from '../../../common/utils/string.util';

export class QueryAdminDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  search?: string;

  @IsOptional()
  @Transform(({ obj, value }) => parseQueryBoolean(obj.isActive ?? value))
  @IsBoolean()
  isActive?: boolean;
}
