import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AdminRole } from '../../modules/admins/enums/admin-role.enum';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { IS_CANDIDATE_AUTH_KEY } from '../decorators/candidate-auth.decorator';
import { IS_CENTRE_AUTH_KEY } from '../decorators/centre-auth.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { apiError } from '../utils/api-response.util';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const isCentreAuth = this.reflector.getAllAndOverride<boolean>(
      IS_CENTRE_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isCentreAuth) {
      return true;
    }

    const isCandidateAuth = this.reflector.getAllAndOverride<boolean>(
      IS_CANDIDATE_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isCandidateAuth) {
      return true;
    }

    const roles = this.reflector.getAllAndOverride<AdminRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user || !roles.includes(user.role)) {
      throw new ForbiddenException(
        apiError('You do not have access to this resource'),
      );
    }

    return true;
  }
}
