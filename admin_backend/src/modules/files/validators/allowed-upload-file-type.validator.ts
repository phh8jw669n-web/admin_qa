import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { FILE_TYPE_NOT_ALLOWED_MESSAGE } from '../constants/upload.constants';
import {
  isAllowedUploadContentType,
  isAllowedUploadFileName,
} from '../utils/upload-file-type.util';

@ValidatorConstraint({ name: 'isAllowedUploadContentType', async: false })
class IsAllowedUploadContentTypeConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown): boolean {
    return typeof value === 'string' && isAllowedUploadContentType(value);
  }

  defaultMessage(): string {
    return FILE_TYPE_NOT_ALLOWED_MESSAGE;
  }
}

export function IsAllowedUploadContentType(
  validationOptions?: ValidationOptions,
) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsAllowedUploadContentTypeConstraint,
    });
  };
}

@ValidatorConstraint({ name: 'isAllowedUploadFileName', async: false })
class IsAllowedUploadFileNameConstraint
  implements ValidatorConstraintInterface
{
  validate(value: unknown): boolean {
    return typeof value === 'string' && isAllowedUploadFileName(value);
  }

  defaultMessage(): string {
    return FILE_TYPE_NOT_ALLOWED_MESSAGE;
  }
}

export function IsAllowedUploadFileName(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsAllowedUploadFileNameConstraint,
    });
  };
}
