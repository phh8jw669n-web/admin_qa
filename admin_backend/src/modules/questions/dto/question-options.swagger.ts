import { ApiProperty } from '@nestjs/swagger';
import { FillInAnswerType } from '../enums/question.enum';

export class ChoiceOptionDto {
  @ApiProperty({
    example: 'a',
    description: 'Required. Use the same id in every language.',
  })
  id!: string;

  @ApiProperty({
    example: '4',
    description: 'Required. Choice text for this language.',
  })
  text!: string;
}

export class SingleChoiceOptionsDto {
  @ApiProperty({
    type: [ChoiceOptionDto],
    minItems: 2,
    description: 'Required. At least 2 choices.',
  })
  options!: ChoiceOptionDto[];

  @ApiProperty({
    type: [String],
    example: ['a'],
    minItems: 1,
    maxItems: 1,
    description: 'Required. Exactly 1 id from options.',
  })
  correctOptions!: string[];
}

export class MultipleChoiceOptionsDto {
  @ApiProperty({
    type: [ChoiceOptionDto],
    minItems: 2,
    description: 'Required. At least 2 choices.',
  })
  options!: ChoiceOptionDto[];

  @ApiProperty({
    type: [String],
    example: ['a', 'c'],
    minItems: 2,
    description: 'Required. At least 2 ids from options.',
  })
  correctOptions!: string[];
}

export class FillInTheBlanksOptionsDto {
  @ApiProperty({
    enum: FillInAnswerType,
    example: FillInAnswerType.ALPHANUMERIC,
    description: 'Required. alphanumeric or numbers.',
  })
  answerType!: FillInAnswerType;

  @ApiProperty({
    example: 'Paris',
    description:
      'Required. Cannot be empty. For numbers, the value must be numeric.',
  })
  answer!: string;
}
