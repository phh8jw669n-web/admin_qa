import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { AuthenticatedRequest } from '../../../common/auth/auth.types';
import { IS_CENTRE_AUTH_KEY } from '../../../common/decorators/centre-auth.decorator';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { CentreUserJwtPayload } from '../../../common/types/jwt-payload.type';
import { apiError } from '../../../common/utils/api-response.util';
import { CompaniesService } from '../../companies/companies.service';
import { CompanyStatus } from '../../companies/enums/company.enum';
import { CentreUser } from '../entities/centre-user.entity';

@Injectable()
export class CentreUserJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    @InjectRepository(CentreUser)
    private readonly centreUsersRepository: Repository<CentreUser>,
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

    if (!isCentreAuth) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException(apiError('Please sign in to continue'));
    }

    try {
      const payload = await this.jwtService.verifyAsync<CentreUserJwtPayload>(
        token,
        {
          secret: this.configService.getOrThrow<string>('jwt.centreSecret'),
        },
      );

      if (!payload.sub || payload.type !== 'centre-user') {
        throw new UnauthorizedException(apiError('Invalid access token'));
      }

      const centreUser = await this.centreUsersRepository.findOne({
        where: { id: payload.sub, isActive: true },
      });

      if (!centreUser) {
        throw new UnauthorizedException(apiError('Invalid access token'));
      }

      if (
        typeof payload.tv !== 'number' ||
        payload.tv !== centreUser.tokenVersion
      ) {
        throw new UnauthorizedException(apiError('Please sign in to continue'));
      }

      try {
        const company = await this.companiesService.findOne(
          centreUser.companyId,
        );

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

      request.companyId = centreUser.companyId;
      request.userId = centreUser.id;
      request.centreId = centreUser.centreId;
      request.isCentreUser = true;

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
