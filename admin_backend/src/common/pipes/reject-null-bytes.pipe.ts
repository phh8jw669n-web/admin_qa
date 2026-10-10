import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import { NULL_CHARACTER_MESSAGE } from '../constants/validation.constants';
import { apiError } from '../utils/api-response.util';
import { containsNullCharacter } from '../utils/string.util';

@Injectable()
export class RejectNullBytesPipe implements PipeTransform {
  transform(value: unknown) {
    if (containsNullCharacter(value)) {
      throw new BadRequestException(apiError(NULL_CHARACTER_MESSAGE));
    }

    return value;
  }
}
