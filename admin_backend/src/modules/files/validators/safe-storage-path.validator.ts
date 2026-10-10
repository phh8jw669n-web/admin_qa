import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';
import { INVALID_STORAGE_PATH_MESSAGE, isSafeStoragePath } from '../utils/storage-path.util';

@ValidatorConstraint({ name: 'isSafeStoragePath', async: false })
class IsSafeStoragePathConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === 'string' && isSafeStoragePath(value);
  }

  defaultMessage(): string {
    return INVALID_STORAGE_PATH_MESSAGE;
  }
}

export function IsSafeStoragePath(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsSafeStoragePathConstraint,
    });
  };
}
