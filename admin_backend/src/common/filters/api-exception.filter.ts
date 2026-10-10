import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { QueryFailedError } from 'typeorm';
import { apiError, isApiResponse } from '../utils/api-response.util';
import { QueryFailedFilter } from './query-failed.filter';

type PayloadTooLargeError = Error & {
  type?: string;
  status?: number;
  statusCode?: number;
};

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ApiExceptionFilter.name);
  private readonly queryFailedFilter = new QueryFailedFilter();

  catch(exception: unknown, host: ArgumentsHost) {
    if (exception instanceof QueryFailedError) {
      try {
        this.queryFailedFilter.catch(exception, host);
      } catch (mapped) {
        exception = mapped;
      }
    }

    const response = host.switchToHttp().getResponse<Response>();

    if (this.isPayloadTooLarge(exception)) {
      return response
        .status(HttpStatus.PAYLOAD_TOO_LARGE)
        .json(apiError('Request body is too large'));
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      if (isApiResponse(body)) {
        return response.status(status).json(body);
      }

      if (typeof body === 'string') {
        return response.status(status).json(apiError(body));
      }

      const message = (body as { message?: string | string[] }).message;

      if (Array.isArray(message)) {
        return response.status(status).json(apiError(message));
      }

      if (typeof message === 'string') {
        return response.status(status).json(apiError(message));
      }

      return response.status(status).json(apiError());
    }

    this.logger.error(
      exception instanceof Error ? exception.message : exception,
      exception instanceof Error ? exception.stack : undefined,
    );

    return response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(apiError('Something went wrong. Please try again.'));
  }

  private isPayloadTooLarge(exception: unknown): boolean {
    if (!exception || typeof exception !== 'object') {
      return false;
    }

    const error = exception as PayloadTooLargeError;

    return (
      error.type === 'entity.too.large' ||
      error.status === HttpStatus.PAYLOAD_TOO_LARGE ||
      error.statusCode === HttpStatus.PAYLOAD_TOO_LARGE ||
      error.name === 'PayloadTooLargeError'
    );
  }
}
