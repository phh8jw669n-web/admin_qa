import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { randomUUID } from 'crypto';
import { LoginLockoutService } from '../../common/auth/login-lockout.service';
import { AUTH_ERRORS } from '../../common/constants/auth.constants';
import { AuthUserType } from '../../common/constants/auth-user-type';
import {
  CentreUserJwtPayload,
  CentreUserRefreshPayload,
  CompanyTokenPayload,
} from '../../common/types/jwt-payload.type';
import { apiError } from '../../common/utils/api-response.util';
import { comparePassword } from '../../common/utils/password.util';
import { hashToken, verifyTokenHash } from '../../common/utils/token.util';
import { CompaniesService } from '../companies/companies.service';
import { CompanyStatus } from '../companies/enums/company.enum';
import { CentreUsersService } from './centre-users.service';
import { CentreUserLoginDto } from './dto/centre-user-login.dto';
import { CentreUser } from './entities/centre-user.entity';
import {
  AuthCentreUser,
  CentreUserAuthTokens,
} from './types/centre-user.type';

const CENTRE_USER_LOGIN_SCOPE = 'centre-user-login';

@Injectable()
export class CentreUsersAuthService {
  constructor(
    private readonly centreUsersService: CentreUsersService,
    private readonly companiesService: CompaniesService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly loginLockout: LoginLockoutService,
  ) {}

  async login(dto: CentreUserLoginDto): Promise<CentreUserAuthTokens> {
    await this.loginLockout.assertNotLocked(CENTRE_USER_LOGIN_SCOPE, dto.email);

    try {
      const tokens = await this.attemptLogin(dto);
      await this.loginLockout.clearFailures(CENTRE_USER_LOGIN_SCOPE, dto.email);
      return tokens;
    } catch (error) {
      if (this.isLoginFailure(error)) {
        await this.loginLockout.recordFailure(
          CENTRE_USER_LOGIN_SCOPE,
          dto.email,
        );
      }

      throw error;
    }
  }

  async refresh(refreshToken: string): Promise<CentreUserAuthTokens> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const centreUser = await this.centreUsersService.findActiveById(
      payload.sub,
    );

    if (!centreUser?.refreshTokenHash) {
      throw new UnauthorizedException(apiError('Invalid refresh token'));
    }

    if (!verifyTokenHash(refreshToken, centreUser.refreshTokenHash)) {
      throw new UnauthorizedException(apiError('Invalid refresh token'));
    }

    return this.issueTokens(centreUser);
  }

  async logout(centreUserId: string): Promise<void> {
    await this.centreUsersService.invalidateSession(centreUserId);
  }

  async me(centreUserId: string): Promise<AuthCentreUser> {
    const centreUser = await this.centreUsersService.findActiveById(
      centreUserId,
    );

    if (!centreUser) {
      throw new UnauthorizedException(apiError('Invalid access token'));
    }

    return this.toAuthCentreUser(centreUser);
  }

  private async attemptLogin(
    dto: CentreUserLoginDto,
  ): Promise<CentreUserAuthTokens> {
    const companyId = await this.verifyCompanyToken(dto.companyToken);
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

    const centreUser = await this.centreUsersService.findByEmailAndCompanyId(
      dto.email,
      companyId,
    );
    const passwordValid = await comparePassword(
      dto.password,
      centreUser?.passwordHash,
    );

    if (!centreUser || !passwordValid) {
      throw new UnauthorizedException(apiError(AUTH_ERRORS.INVALID_CREDENTIALS));
    }

    if (!centreUser.isActive) {
      throw new UnauthorizedException(apiError(AUTH_ERRORS.ACCOUNT_INACTIVE));
    }

    return this.issueTokens(centreUser);
  }

  private async issueTokens(
    centreUser: CentreUser,
  ): Promise<CentreUserAuthTokens> {
    const accessExpiresIn = this.getExpiresIn('jwt.expiresIn', '15m');
    const refreshExpiresIn = this.getExpiresIn('jwt.refreshExpiresIn', '7d');
    const accessSecret =
      this.configService.getOrThrow<string>('jwt.centreSecret');
    const refreshSecret = this.configService.getOrThrow<string>(
      'jwt.centreRefreshSecret',
    );

    const accessPayload: CentreUserJwtPayload = {
      sub: centreUser.id,
      email: centreUser.email ?? '',
      type: 'centre-user',
      companyId: centreUser.companyId,
      centreId: centreUser.centreId,
      tv: centreUser.tokenVersion,
    };
    const refreshPayload: CentreUserRefreshPayload = {
      sub: centreUser.id,
      type: 'centre-refresh',
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

    await this.centreUsersService.setRefreshTokenHash(
      centreUser.id,
      hashToken(refreshToken),
    );

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: String(accessExpiresIn),
      userType: AuthUserType.CENTRE_USER,
      centreUser: this.toAuthCentreUser(centreUser),
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
  ): Promise<CentreUserRefreshPayload> {
    try {
      const payload = await this.jwtService.verifyAsync<CentreUserRefreshPayload>(
        refreshToken,
        {
          secret: this.configService.getOrThrow<string>(
            'jwt.centreRefreshSecret',
          ),
        },
      );

      if (payload.type !== 'centre-refresh' || !payload.sub || !payload.jti) {
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

  private toAuthCentreUser(centreUser: CentreUser): AuthCentreUser {
    return {
      id: centreUser.id,
      companyId: centreUser.companyId,
      centreId: centreUser.centreId,
      name: centreUser.name,
      email: centreUser.email,
      isActive: centreUser.isActive,
      enableMail: centreUser.enableMail,
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
