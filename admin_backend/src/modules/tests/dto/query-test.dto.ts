import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { parseQueryBoolean } from '../../../common/utils/boolean.util';
import { trimString } from '../../../common/utils/string.util';

export class QueryTestDto extends PaginationQueryDto {
  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  name?: string;

  @IsOptional()
  @Transform(({ value }) => trimString(value))
  @IsString()
  testCode?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  templateId?: string;

  @IsOptional()
  @Transform(({ obj, value }) => parseQueryBoolean(obj.isDraft ?? value))
  @IsBoolean()
  isDraft?: boolean;

  @IsOptional()
  @Transform(({ obj, value }) => parseQueryBoolean(obj.isPublished ?? value))
  @IsBoolean()
  isPublished?: boolean;

  @IsOptional()
  @Transform(({ obj, value }) => parseQueryBoolean(obj.isActive ?? value))
  @IsBoolean()
  isActive?: boolean;
}
