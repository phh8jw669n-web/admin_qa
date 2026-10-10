import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  registerDecorator,
  ValidationOptions,
} from 'class-validator';
import { FillInAnswerType, QuestionType } from '../enums/question.enum';

function isChoiceItem(value: unknown): value is { id: string; text: string } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const item = value as { id?: unknown; text?: unknown };

  return (
    typeof item.id === 'string' &&
    item.id.trim().length > 0 &&
    typeof item.text === 'string' &&
    item.text.trim().length > 0
  );
}

function validateChoiceOptions(
  value: unknown,
  minCorrect: number,
  maxCorrect?: number,
): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const payload = value as {
    options?: unknown;
    correctOptions?: unknown;
  };

  if (!Array.isArray(payload.options) || payload.options.length < 2) {
    return false;
  }

  if (!payload.options.every(isChoiceItem)) {
    return false;
  }

  const optionIds = payload.options.map((option) => option.id);

  if (new Set(optionIds).size !== optionIds.length) {
    return false;
  }

  if (
    !Array.isArray(payload.correctOptions) ||
    payload.correctOptions.length < minCorrect
  ) {
    return false;
  }

  if (maxCorrect !== undefined && payload.correctOptions.length > maxCorrect) {
    return false;
  }

  if (payload.correctOptions.length > optionIds.length) {
    return false;
  }

  const uniqueCorrect = new Set(payload.correctOptions);

  if (uniqueCorrect.size !== payload.correctOptions.length) {
    return false;
  }

  return payload.correctOptions.every(
    (id) => typeof id === 'string' && optionIds.includes(id),
  );
}

function validateFillInTheBlanks(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const payload = value as { answerType?: unknown; answer?: unknown };
  const answerType = payload.answerType;

  if (
    answerType !== FillInAnswerType.ALPHANUMERIC &&
    answerType !== FillInAnswerType.NUMBERS
  ) {
    return false;
  }

  if (
    payload.answer === undefined ||
    payload.answer === null ||
    payload.answer === ''
  ) {
    return false;
  }

  if (
    answerType === FillInAnswerType.NUMBERS &&
    Number.isNaN(Number(payload.answer))
  ) {
    return false;
  }

  return true;
}

@ValidatorConstraint({ name: 'questionOptionsByType', async: false })
export class QuestionOptionsByTypeConstraint
  implements ValidatorConstraintInterface
{
  validate(options: unknown, args: ValidationArguments): boolean {
    const questionType = (args.object as { questionType?: QuestionType })
      .questionType;

    if (questionType === QuestionType.MULTIPLE_CHOICE) {
      return validateChoiceOptions(options, 2);
    }

    if (questionType === QuestionType.SINGLE_CHOICE) {
      return validateChoiceOptions(options, 1, 1);
    }

    if (questionType === QuestionType.FILL_IN_THE_BLANKS) {
      return validateFillInTheBlanks(options);
    }

    if (questionType === QuestionType.COMPREHENSION) {
      return options === undefined || options === null;
    }

    return false;
  }

  defaultMessage(args: ValidationArguments): string {
    const questionType = (args.object as { questionType?: QuestionType })
      .questionType;

    if (questionType === QuestionType.MULTIPLE_CHOICE) {
      return 'MCQ options must include at least 2 choices and at least 2 valid correctOptions ids';
    }

    if (questionType === QuestionType.SINGLE_CHOICE) {
      return 'SCQ options must include at least 2 choices and exactly 1 correctOptions id';
    }

    if (questionType === QuestionType.FILL_IN_THE_BLANKS) {
      return 'Fill in the blanks options must be { answerType: alphanumeric|numbers, answer }';
    }

    return 'Invalid options for questionType';
  }
}

export function IsQuestionOptionsValid(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: QuestionOptionsByTypeConstraint,
    });
  };
}
