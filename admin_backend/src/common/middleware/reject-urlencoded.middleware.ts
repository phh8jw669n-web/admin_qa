import {
  HttpException,
  HttpStatus,
  Injectable,
  NestMiddleware,
} from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { apiError } from '../utils/api-response.util';

const METHODS_WITH_BODY = new Set(['POST', 'PUT', 'PATCH']);

@Injectable()
export class RejectUrlencodedMiddleware implements NestMiddleware {
  use(request: Request, _response: Response, next: NextFunction) {
    if (
      METHODS_WITH_BODY.has(request.method) &&
      this.isUrlEncoded(request.headers['content-type'])
    ) {
      throw new HttpException(
        apiError('Content-Type must be application/json'),
        HttpStatus.UNSUPPORTED_MEDIA_TYPE,
      );
    }

    next();
  }

  private isUrlEncoded(contentType?: string | string[]): boolean {
    const header = Array.isArray(contentType) ? contentType[0] : contentType;

    return (
      typeof header === 'string' &&
      header.toLowerCase().includes('application/x-www-form-urlencoded')
    );
  }
}
