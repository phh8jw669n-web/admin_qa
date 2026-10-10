import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AdminsService } from '../../admins/admins.service';
import { AdminRole } from '../../admins/enums/admin-role.enum';
import type { AuthenticatedRequest } from '../../../common/auth/auth.types';
import { SUPER_ADMIN_ERRORS } from '../constants/super-admin.constants';
import { apiError } from '../../../common/utils/api-response.util';

@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly adminsService: AdminsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user?.sub) {
      throw new UnauthorizedException(
        apiError('User ID not found in request context'),
      );
    }

    if (user.isSuperAdmin) {
      return true;
    }

    const admin = await this.adminsService.findActiveById(user.sub);

    if (
      !admin ||
      admin.role !== AdminRole.SUPER_ADMIN ||
      admin.companyId !== null
    ) {
      throw new ForbiddenException(apiError(SUPER_ADMIN_ERRORS.FORBIDDEN));
    }

    request.user = {
      ...user,
      isSuperAdmin: true,
    };

    return true;
  }
}
