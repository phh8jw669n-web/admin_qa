import { IsInt, IsUUID, Max, Min } from 'class-validator';
import { INT4_MAX } from '../../../common/constants/validation.constants';

export class CreateCategorySubjectTopicMappingDto {
  @IsUUID()
  categoryId!: string;

  @IsUUID()
  subjectId!: string;

  @IsUUID()
  topicId!: string;

  @IsInt()
  @Min(0)
  @Max(INT4_MAX)
  ranking!: number;
}
