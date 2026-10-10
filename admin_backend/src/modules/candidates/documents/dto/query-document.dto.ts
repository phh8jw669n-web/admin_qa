import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from '../../../../common/dto/pagination-query.dto';
import { parseQueryBoolean } from '../../../../common/utils/boolean.util';
import { CandidateDocumentType } from '../enums/document-type.enum';

export class QueryDocumentDto extends PaginationQueryDto {
  @IsOptional()
  @IsEnum(CandidateDocumentType)
  documentType?: CandidateDocumentType;

  @IsOptional()
  @Transform(({ obj, value }) => parseQueryBoolean(obj.isActive ?? value))
  @IsBoolean()
  isActive?: boolean;
}
