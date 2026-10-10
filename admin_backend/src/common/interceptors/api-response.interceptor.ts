import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, map } from 'rxjs';
import {
  ApiResponse,
  apiData,
  isApiResponse,
} from '../utils/api-response.util';

@Injectable()
export class ApiResponseInterceptor implements NestInterceptor {
  intercept(
    _context: ExecutionContext,
    next: CallHandler,
  ): Observable<unknown> {
    return next.handle().pipe(map((payload) => this.wrap(payload)));
  }

  private wrap(payload: unknown): ApiResponse<unknown> {
    if (isApiResponse(payload)) {
      return payload;
    }

    if (payload === undefined) {
      return { success: true };
    }

    return apiData(payload);
  }
}
