import {
  Inject,
  Injectable,
  Scope,
  UnauthorizedException,
} from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import { apiError } from '../utils/api-response.util';
import type { AuthenticatedRequest } from './auth.types';

@Injectable({ scope: Scope.REQUEST })
export class CompanyContextService {
  constructor(
    @Inject(REQUEST) private readonly request: AuthenticatedRequest,
  ) {}

  getOptionalCompanyId(): string | null {
    return this.request.companyId ?? null;
  }

  getCompanyId(): string {
    if (!this.request.companyId) {
      throw new UnauthorizedException(
        apiError('Please sign in again'),
      );
    }

    return this.request.companyId;
  }

  getUserId(): string {
    if (!this.request.userId) {
      throw new UnauthorizedException(
        apiError('Please sign in again'),
      );
    }

    return this.request.userId;
  }

  getOptionalCentreId(): string | null {
    return this.request.centreId ?? null;
  }

  getCentreId(): string {
    if (!this.request.centreId) {
      throw new UnauthorizedException(apiError('Please sign in again'));
    }

    return this.request.centreId;
  }
}
