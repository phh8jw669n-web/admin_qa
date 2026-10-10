import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { INT4_MAX } from '../../../common/constants/validation.constants';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { TestCandidateMappingStatus } from '../enums/test-candidate-mapping.enum';

export class QueryTestCandidateMappingDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @IsOptional()
  @IsUUID()
  candidateId?: string;

  @IsOptional()
  @IsUUID()
  testId?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(INT4_MAX)
  attemptNo?: number;

  @IsOptional()
  @IsEnum(TestCandidateMappingStatus)
  status?: TestCandidateMappingStatus;
}
