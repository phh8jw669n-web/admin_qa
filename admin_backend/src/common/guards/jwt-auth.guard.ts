import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AdminsService } from '../../modules/admins/admins.service';
import { AdminRole } from '../../modules/admins/enums/admin-role.enum';
import { CompaniesService } from '../../modules/companies/companies.service';
import { CompanyStatus } from '../../modules/companies/enums/company.enum';
import type { AuthenticatedRequest } from '../auth/auth.types';
import { apiError } from '../utils/api-response.util';
import { IS_CANDIDATE_AUTH_KEY } from '../decorators/candidate-auth.decorator';
import { IS_CENTRE_AUTH_KEY } from '../decorators/centre-auth.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { JwtPayload } from '../types/jwt-payload.type';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly adminsService: AdminsService,
    private readonly companiesService: CompaniesService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
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

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException(apiError('Please sign in to continue'));
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('jwt.secret'),
      });

      if (!payload.sub) {
        throw new UnauthorizedException(apiError('Invalid access token'));
      }

      const admin = await this.adminsService.findActiveById(payload.sub);

      if (!admin) {
        throw new UnauthorizedException(apiError('Invalid access token'));
      }

      if (
        typeof payload.tv !== 'number' ||
        payload.tv !== admin.tokenVersion
      ) {
        throw new UnauthorizedException(
          apiError('Please sign in to continue'),
        );
      }

      const isSuperAdmin =
        admin.role === AdminRole.SUPER_ADMIN && admin.companyId === null;

      request.user = {
        sub: admin.id,
        email: admin.email,
        role: admin.role,
        companyId: admin.companyId,
        isSuperAdmin,
        tv: admin.tokenVersion,
      };
      request.userId = admin.id;
      request.isSuperAdmin = isSuperAdmin;

      if (admin.companyId) {
        try {
          const company = await this.companiesService.findOne(admin.companyId);

          if (
            !company.isActive ||
            company.status !== CompanyStatus.ACTIVE ||
            (company.planEndsAt && company.planEndsAt.getTime() < Date.now())
          ) {
            throw new UnauthorizedException(apiError('Company is not active'));
          }
        } catch {
          throw new UnauthorizedException(apiError('Company is not active'));
        }

        request.companyId = admin.companyId;
      }

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new UnauthorizedException(
        apiError('Invalid or expired access token'),
      );
    }
  }

  private extractBearerToken(
    request: AuthenticatedRequest,
  ): string | undefined {
    const [scheme, token] = (request.headers.authorization ?? '').split(' ');

    if (scheme !== 'Bearer' || !token) {
      return undefined;
    }

    return token;
  }
}
