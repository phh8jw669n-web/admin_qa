import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { INT4_MAX } from '../../../common/constants/validation.constants';

export class UpdateCategorySubjectTopicMappingDto {
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @IsOptional()
  @IsUUID()
  topicId?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(INT4_MAX)
  ranking?: number;
}
