import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { PaginationQueryDto } from '../../../common/dto/pagination-query.dto';
import { parseQueryBoolean } from '../../../common/utils/boolean.util';
import { QuestionType } from '../enums/question.enum';

export class QueryQuestionDto extends PaginationQueryDto {
  @IsOptional()
  @IsUUID()
  testId?: string;

  @IsOptional()
  @IsUUID()
  subjectId?: string;

  @IsOptional()
  @IsUUID()
  topicId?: string;

  @IsOptional()
  @IsEnum(QuestionType)
  questionType?: QuestionType;

  @IsOptional()
  @Transform(({ obj, value }) => parseQueryBoolean(obj.isActive ?? value))
  @IsBoolean()
  isActive?: boolean;
}
