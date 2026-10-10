import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginLockoutService } from '../../common/auth/login-lockout.service';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { AUTH_ERRORS } from '../../common/constants/auth.constants';
import { AuthUserType } from '../../common/constants/auth-user-type';
import { comparePassword } from '../../common/utils/password.util';
import { hashToken, verifyTokenHash } from '../../common/utils/token.util';
import {
  CompanyTokenPayload,
  JwtPayload,
  JwtRefreshPayload,
} from '../../common/types/jwt-payload.type';
import { AdminsService } from '../admins/admins.service';
import { apiError } from '../../common/utils/api-response.util';
import { Admin } from '../admins/entities/admin.entity';
import { AdminRole } from '../admins/enums/admin-role.enum';
import { CompaniesService } from '../companies/companies.service';
import { CompanyStatus } from '../companies/enums/company.enum';
import { LoginDto } from './dto/login.dto';
import { AuthAdmin, AuthTokens } from './types/auth-tokens.type';

const COMPANY_LOGIN_SCOPE = 'company-login';

@Injectable()
export class AuthService {
  constructor(
    private readonly adminsService: AdminsService,
    private readonly companiesService: CompaniesService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly loginLockout: LoginLockoutService,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthTokens> {
    await this.loginLockout.assertNotLocked(
      COMPANY_LOGIN_SCOPE,
      loginDto.email,
    );

    try {
      const tokens = await this.attemptLogin(loginDto);
      await this.loginLockout.clearFailures(
        COMPANY_LOGIN_SCOPE,
        loginDto.email,
      );
      return tokens;
    } catch (error) {
      if (this.isLoginFailure(error)) {
        await this.loginLockout.recordFailure(
          COMPANY_LOGIN_SCOPE,
          loginDto.email,
        );
      }

      throw error;
    }
  }

  private async attemptLogin(loginDto: LoginDto): Promise<AuthTokens> {
    const companyId = await this.verifyCompanyToken(loginDto.companyToken);
    const company = await this.companiesService.findOne(companyId);

    if (!company.isActive || company.status !== CompanyStatus.ACTIVE) {
      throw new BadRequestException(
        apiError('Invalid workspace or company is not active'),
      );
    }

    if (company.planEndsAt && company.planEndsAt.getTime() < Date.now()) {
      throw new ForbiddenException(
        apiError('Company plan has expired. Please renew your subscription.'),
      );
    }

    const admin = await this.adminsService.findByEmailAndCompanyId(
      loginDto.email,
      companyId,
    );

    const passwordHash =
      admin && admin.role !== AdminRole.SUPER_ADMIN
        ? admin.passwordHash
        : null;
    const passwordValid = await comparePassword(
      loginDto.password,
      passwordHash,
    );

    if (
      !admin ||
      admin.role === AdminRole.SUPER_ADMIN ||
      !passwordValid
    ) {
      throw new UnauthorizedException(
        apiError(AUTH_ERRORS.INVALID_CREDENTIALS),
      );
    }

    if (!admin.isActive) {
      throw new UnauthorizedException(apiError(AUTH_ERRORS.ACCOUNT_INACTIVE));
    }

    return this.generateTokenPair(admin);
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const admin = await this.adminsService.findActiveById(payload.sub);

    if (!admin?.refreshTokenHash) {
      throw new UnauthorizedException(apiError('Invalid refresh token'));
    }

    if (!verifyTokenHash(refreshToken, admin.refreshTokenHash)) {
      throw new UnauthorizedException(apiError('Invalid refresh token'));
    }

    return this.generateTokenPair(admin);
  }

  async logout(adminId: string): Promise<void> {
    await this.adminsService.invalidateSession(adminId);
  }

  async me(adminId: string): Promise<AuthAdmin> {
    const admin = await this.adminsService.findActiveById(adminId);

    if (!admin) {
      throw new UnauthorizedException(apiError('Invalid access token'));
    }

    return this.toAuthAdmin(admin);
  }

  generateTokenPair(admin: Admin): Promise<AuthTokens> {
    return this.issueTokens(admin);
  }

  private async issueTokens(admin: Admin): Promise<AuthTokens> {
    const accessExpiresIn = this.getExpiresIn('jwt.expiresIn', '15m');
    const refreshExpiresIn = this.getExpiresIn('jwt.refreshExpiresIn', '7d');
    const accessSecret = this.configService.getOrThrow<string>('jwt.secret');
    const refreshSecret =
      this.configService.getOrThrow<string>('jwt.refreshSecret');
    const isSuperAdmin =
      admin.role === AdminRole.SUPER_ADMIN && admin.companyId === null;

    const accessPayload: JwtPayload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      companyId: admin.companyId,
      isSuperAdmin,
      tv: admin.tokenVersion,
    };
    const refreshPayload: JwtRefreshPayload = {
      sub: admin.id,
      type: 'refresh',
      jti: randomUUID(),
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(accessPayload, {
        secret: accessSecret,
        expiresIn: accessExpiresIn,
      }),
      this.jwtService.signAsync(refreshPayload, {
        secret: refreshSecret,
        expiresIn: refreshExpiresIn,
      }),
    ]);

    await this.adminsService.setRefreshTokenHash(
      admin.id,
      hashToken(refreshToken),
    );

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: String(accessExpiresIn),
      userType: AuthUserType.ADMIN,
      admin: this.toAuthAdmin(admin),
    };
  }

  private async verifyCompanyToken(companyToken: string): Promise<string> {
    try {
      const payload = await this.jwtService.verifyAsync<CompanyTokenPayload>(
        companyToken,
        {
          secret: this.configService.getOrThrow<string>('jwt.companySecret'),
        },
      );

      if (payload.type !== 'company' || !payload.sub) {
        throw new UnauthorizedException(
          apiError('Invalid or expired company token'),
        );
      }

      return payload.sub;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException(
        apiError('Invalid or expired company token'),
      );
    }
  }

  private async verifyRefreshToken(
    refreshToken: string,
  ): Promise<JwtRefreshPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<JwtRefreshPayload>(
        refreshToken,
        { secret: this.configService.getOrThrow<string>('jwt.refreshSecret') },
      );

      if (payload.type !== 'refresh' || !payload.sub || !payload.jti) {
        throw new UnauthorizedException(apiError('Invalid refresh token'));
      }

      return payload;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException(
        apiError('Invalid or expired refresh token'),
      );
    }
  }

  private getExpiresIn(
    key: string,
    fallback: string,
  ): NonNullable<JwtSignOptions['expiresIn']> {
    return (this.configService.get<string>(key) ?? fallback) as NonNullable<
      JwtSignOptions['expiresIn']
    >;
  }

  private toAuthAdmin(admin: Admin): AuthAdmin {
    return {
      id: admin.id,
      companyId: admin.companyId,
      firstName: admin.firstName,
      lastName: admin.lastName,
      email: admin.email,
      role: admin.role,
      isMfaEnabled: admin.isMfaEnabled,
      isActive: admin.isActive,
      profileImageUrl: admin.profileImageUrl,
    };
  }

  private isLoginFailure(error: unknown): boolean {
    return (
      error instanceof BadRequestException ||
      error instanceof ForbiddenException ||
      error instanceof UnauthorizedException
    );
  }
}
