import { IsDateString, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';

export class QueryCandidateCentreMappingDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  candidateId?: string;

  @IsOptional()
  @IsUUID()
  centreId?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  examDate?: string;
}
