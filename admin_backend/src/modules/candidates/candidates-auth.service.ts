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
  CandidateJwtPayload,
  CandidateRefreshPayload,
  CompanyTokenPayload,
} from '../../common/types/jwt-payload.type';
import { apiError } from '../../common/utils/api-response.util';
import { comparePassword } from '../../common/utils/password.util';
import { hashToken, verifyTokenHash } from '../../common/utils/token.util';
import { utcDateString } from '../../common/utils/time.util';
import { CandidateCentreMappingsService } from '../candidate-centre-mappings/candidate-centre-mappings.service';
import { CentresService } from '../centres/centres.service';
import { Centre } from '../centres/entities/centre.entity';
import { CompaniesService } from '../companies/companies.service';
import { CompanyStatus } from '../companies/enums/company.enum';
import { CandidatesService } from './candidates.service';
import { CandidateLoginDto } from './dto/candidate-login.dto';
import { Candidate } from './entities/candidate.entity';
import {
  AuthCandidate,
  CandidateAuthTokens,
  CandidateExamDesk,
} from './types/candidate-auth.type';

const CANDIDATE_LOGIN_SCOPE = 'candidate-login';

@Injectable()
export class CandidatesAuthService {
  constructor(
    private readonly candidatesService: CandidatesService,
    private readonly companiesService: CompaniesService,
    private readonly centresService: CentresService,
    private readonly candidateCentreMappingsService: CandidateCentreMappingsService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly loginLockout: LoginLockoutService,
  ) {}

  async login(dto: CandidateLoginDto): Promise<CandidateAuthTokens> {
    const lockoutKey = dto.enrollmentNumber;

    await this.loginLockout.assertNotLocked(CANDIDATE_LOGIN_SCOPE, lockoutKey);

    try {
      const tokens = await this.attemptLogin(dto);
      await this.loginLockout.clearFailures(CANDIDATE_LOGIN_SCOPE, lockoutKey);
      return tokens;
    } catch (error) {
      if (this.isLoginFailure(error)) {
        await this.loginLockout.recordFailure(
          CANDIDATE_LOGIN_SCOPE,
          lockoutKey,
        );
      }

      throw error;
    }
  }

  async refresh(refreshToken: string): Promise<CandidateAuthTokens> {
    const payload = await this.verifyRefreshToken(refreshToken);
    const candidate = await this.candidatesService.findActiveById(payload.sub);

    if (!candidate?.refreshTokenHash) {
      throw new UnauthorizedException(apiError('Invalid refresh token'));
    }

    if (!verifyTokenHash(refreshToken, candidate.refreshTokenHash)) {
      throw new UnauthorizedException(apiError('Invalid refresh token'));
    }

    const exam = await this.loadExamDesk(candidate);
    return this.issueTokens(candidate, exam);
  }

  async logout(candidateId: string): Promise<void> {
    await this.candidatesService.invalidateSession(candidateId);
  }

  async me(candidateId: string): Promise<AuthCandidate> {
    const candidate = await this.candidatesService.findActiveById(candidateId);

    if (!candidate) {
      throw new UnauthorizedException(apiError('Invalid access token'));
    }

    const exam = await this.loadExamDesk(candidate);
    return this.toAuthCandidate(candidate, exam);
  }

  private async attemptLogin(
    dto: CandidateLoginDto,
  ): Promise<CandidateAuthTokens> {
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

    const candidate =
      await this.candidatesService.findByEnrollmentNumberAndCompanyId(
        dto.enrollmentNumber,
        companyId,
      );
    const passwordValid = await comparePassword(
      dto.password,
      candidate?.passwordHash,
    );

    if (!candidate || !passwordValid) {
      throw new UnauthorizedException(
        apiError(AUTH_ERRORS.INVALID_ENROLLMENT_CREDENTIALS),
      );
    }

    if (!candidate.isActive) {
      throw new UnauthorizedException(apiError(AUTH_ERRORS.ACCOUNT_INACTIVE));
    }

    const exam = await this.resolveExamDesk(companyId, candidate.id, dto);

    return this.issueTokens(candidate, exam);
  }

  private async issueTokens(
    candidate: Candidate,
    exam: CandidateExamDesk,
  ): Promise<CandidateAuthTokens> {
    const accessExpiresIn = this.getExpiresIn('jwt.expiresIn', '15m');
    const refreshExpiresIn = this.getExpiresIn('jwt.refreshExpiresIn', '7d');
    const accessSecret = this.configService.getOrThrow<string>(
      'jwt.candidateSecret',
    );
    const refreshSecret = this.configService.getOrThrow<string>(
      'jwt.candidateRefreshSecret',
    );

    const accessPayload: CandidateJwtPayload = {
      sub: candidate.id,
      enrollmentNumber: candidate.enrollmentNumber,
      type: 'candidate',
      companyId: candidate.companyId,
      centreId: exam.centreId,
      examDate: exam.examDate,
      tv: candidate.tokenVersion,
    };
    const refreshPayload: CandidateRefreshPayload = {
      sub: candidate.id,
      type: 'candidate-refresh',
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

    candidate.examCentreId = exam.centreId;
    candidate.examDate = exam.examDate;

    await this.candidatesService.saveLoginSession(
      candidate.id,
      hashToken(refreshToken),
      exam,
    );

    return {
      accessToken,
      refreshToken,
      tokenType: 'Bearer',
      expiresIn: String(accessExpiresIn),
      userType: AuthUserType.CANDIDATE,
      candidate: this.toAuthCandidate(candidate, exam),
    };
  }

  private async resolveExamDesk(
    companyId: string,
    candidateId: string,
    dto: CandidateLoginDto,
  ): Promise<CandidateExamDesk> {
    const centre = await this.centresService.findActiveByCode(
      dto.centreCode,
      companyId,
    );

    if (!centre) {
      throw new BadRequestException(apiError('Centre not found'));
    }

    const examDate = utcDateString();
    const mapped = await this.candidateCentreMappingsService.isMapped({
      companyId,
      candidateId,
      centreId: centre.id,
      examDate,
    });

    if (!mapped) {
      throw new ForbiddenException(
        apiError('You are not mapped to this centre for this date'),
      );
    }

    return this.toExamDesk(centre, examDate);
  }

  private async loadExamDesk(candidate: Candidate): Promise<CandidateExamDesk> {
    const examDate = utcDateString();

    if (
      !candidate.examCentreId ||
      candidate.examDate !== examDate
    ) {
      throw new UnauthorizedException(apiError('Please sign in again'));
    }

    const centre = await this.centresService.findActiveByIdInCompany(
      candidate.examCentreId,
      candidate.companyId,
    );
    const mapped =
      centre != null &&
      (await this.candidateCentreMappingsService.isMapped({
        companyId: candidate.companyId,
        candidateId: candidate.id,
        centreId: centre.id,
        examDate,
      }));

    if (!centre || !mapped) {
      throw new UnauthorizedException(apiError('Please sign in again'));
    }

    return this.toExamDesk(centre, examDate);
  }

  private toExamDesk(centre: Centre, examDate: string): CandidateExamDesk {
    return {
      centreId: centre.id,
      centreCode: centre.code,
      centreName: centre.name,
      examDate,
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
  ): Promise<CandidateRefreshPayload> {
    try {
      const payload =
        await this.jwtService.verifyAsync<CandidateRefreshPayload>(
          refreshToken,
          {
            secret: this.configService.getOrThrow<string>(
              'jwt.candidateRefreshSecret',
            ),
          },
        );

      if (
        payload.type !== 'candidate-refresh' ||
        !payload.sub ||
        !payload.jti
      ) {
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

  private toAuthCandidate(
    candidate: Candidate,
    exam: CandidateExamDesk,
  ): AuthCandidate {
    return {
      id: candidate.id,
      companyId: candidate.companyId,
      name: candidate.name,
      email: candidate.email,
      enrollmentNumber: candidate.enrollmentNumber,
      isActive: candidate.isActive,
      exam,
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
