import { BadRequestException, ParseUUIDPipe } from '@nestjs/common';
import { UUID_VALIDATION_MESSAGE } from '../constants/validation.constants';
import { apiError } from '../utils/api-response.util';

export const UuidParamPipe = new ParseUUIDPipe({
  exceptionFactory: () =>
    new BadRequestException(apiError(UUID_VALIDATION_MESSAGE)),
});
