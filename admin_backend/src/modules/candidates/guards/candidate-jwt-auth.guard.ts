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
import { IS_CANDIDATE_AUTH_KEY } from '../../../common/decorators/candidate-auth.decorator';
import { IS_PUBLIC_KEY } from '../../../common/decorators/public.decorator';
import { CandidateJwtPayload } from '../../../common/types/jwt-payload.type';
import { apiError } from '../../../common/utils/api-response.util';
import { utcDateString } from '../../../common/utils/time.util';
import { CandidateCentreMapping } from '../../candidate-centre-mappings/entities/candidate-centre-mapping.entity';
import { CompaniesService } from '../../companies/companies.service';
import { CompanyStatus } from '../../companies/enums/company.enum';
import { Candidate } from '../entities/candidate.entity';

@Injectable()
export class CandidateJwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    @InjectRepository(Candidate)
    private readonly candidatesRepository: Repository<Candidate>,
    @InjectRepository(CandidateCentreMapping)
    private readonly mappingsRepository: Repository<CandidateCentreMapping>,
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

    const isCandidateAuth = this.reflector.getAllAndOverride<boolean>(
      IS_CANDIDATE_AUTH_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!isCandidateAuth) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException(apiError('Please sign in to continue'));
    }

    try {
      const payload = await this.jwtService.verifyAsync<CandidateJwtPayload>(
        token,
        {
          secret: this.configService.getOrThrow<string>('jwt.candidateSecret'),
        },
      );

      if (!payload.sub || payload.type !== 'candidate') {
        throw new UnauthorizedException(apiError('Invalid access token'));
      }

      const candidate = await this.candidatesRepository.findOne({
        where: { id: payload.sub, isActive: true },
      });

      if (!candidate) {
        throw new UnauthorizedException(apiError('Invalid access token'));
      }

      if (
        typeof payload.tv !== 'number' ||
        payload.tv !== candidate.tokenVersion
      ) {
        throw new UnauthorizedException(apiError('Please sign in to continue'));
      }

      const examDate = utcDateString();

      if (
        !payload.centreId ||
        payload.examDate !== examDate ||
        payload.centreId !== candidate.examCentreId ||
        candidate.examDate !== examDate
      ) {
        throw new UnauthorizedException(apiError('Please sign in to continue'));
      }

      const mapped = await this.mappingsRepository.existsBy({
        companyId: candidate.companyId,
        candidateId: candidate.id,
        centreId: payload.centreId,
        examDate,
      });

      if (!mapped) {
        throw new UnauthorizedException(apiError('Please sign in to continue'));
      }

      try {
        const company = await this.companiesService.findOne(
          candidate.companyId,
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

      request.companyId = candidate.companyId;
      request.userId = candidate.id;
      request.centreId = candidate.examCentreId ?? undefined;
      request.isCandidate = true;

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
