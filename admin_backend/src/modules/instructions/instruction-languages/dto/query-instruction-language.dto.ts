import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { parseQueryBoolean } from '../../../../common/utils/boolean.util';

export class QueryInstructionLanguageDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  languageId?: string;

  @IsOptional()
  @Transform(({ obj, value }) => parseQueryBoolean(obj.isActive ?? value))
  @IsBoolean()
  isActive?: boolean;
}
