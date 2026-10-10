import { Injectable, UnauthorizedException } from '@nestjs/common';
import { LoginLockoutService } from '../../common/auth/login-lockout.service';
import { AUTH_ERRORS } from '../../common/constants/auth.constants';
import { comparePassword } from '../../common/utils/password.util';
import { AdminsService } from '../admins/admins.service';
import { AdminRole } from '../admins/enums/admin-role.enum';
import { AuthService } from '../auth/auth.service';
import { apiError } from '../../common/utils/api-response.util';
import { SUPER_ADMIN_ERRORS } from './constants/super-admin.constants';
import { SuperAdminLoginDto } from './dto/login.dto';

const SUPER_ADMIN_LOGIN_SCOPE = 'super-admin-login';

@Injectable()
export class SuperAdminAuthService {
  constructor(
    private readonly adminsService: AdminsService,
    private readonly authService: AuthService,
    private readonly loginLockout: LoginLockoutService,
  ) {}

  async login(dto: SuperAdminLoginDto) {
    await this.loginLockout.assertNotLocked(SUPER_ADMIN_LOGIN_SCOPE, dto.email);

    try {
      const tokens = await this.attemptLogin(dto);
      await this.loginLockout.clearFailures(SUPER_ADMIN_LOGIN_SCOPE, dto.email);
      return tokens;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        await this.loginLockout.recordFailure(
          SUPER_ADMIN_LOGIN_SCOPE,
          dto.email,
        );
      }

      throw error;
    }
  }

  private async attemptLogin(dto: SuperAdminLoginDto) {
    const admin = await this.adminsService.findSuperAdminByEmail(dto.email);
    const passwordHash =
      admin?.role === AdminRole.SUPER_ADMIN ? admin.passwordHash : null;
    const passwordValid = await comparePassword(dto.password, passwordHash);

    if (
      !admin ||
      admin.role !== AdminRole.SUPER_ADMIN ||
      !passwordValid
    ) {
      throw new UnauthorizedException(
        apiError(SUPER_ADMIN_ERRORS.INVALID_CREDENTIALS),
      );
    }

    if (!admin.isActive) {
      throw new UnauthorizedException(apiError(AUTH_ERRORS.ACCOUNT_INACTIVE));
    }

    return this.authService.generateTokenPair(admin);
  }

  async logout(adminId: string): Promise<void> {
    await this.authService.logout(adminId);
  }
}
