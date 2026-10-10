import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CompanyContextService } from '../../common/auth/company-context.service';
import { CandidateAuth } from '../../common/decorators/candidate-auth.decorator';
import { LoginRateLimit } from '../../common/decorators/login-rate-limit.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UuidParamPipe } from '../../common/pipes/uuid-param.pipe';
import {
  apiSuccess,
  apiSuccessMessage,
} from '../../common/utils/api-response.util';
import { CandidatesAuthService } from './candidates-auth.service';
import { CandidatesService } from './candidates.service';
import { CandidateLoginDto } from './dto/candidate-login.dto';
import { CandidateRefreshTokenDto } from './dto/candidate-refresh-token.dto';
import { CreateCandidateDto } from './dto/create-candidate.dto';
import { QueryCandidateDto } from './dto/query-candidate.dto';
import { UpdateCandidateDto } from './dto/update-candidate.dto';

@ApiTags('Candidates')
@ApiBearerAuth('JWT')
@Controller('candidates')
export class CandidatesController {
  constructor(
    private readonly candidatesService: CandidatesService,
    private readonly candidatesAuthService: CandidatesAuthService,
    private readonly companyContext: CompanyContextService,
  ) {}

  @Public()
  @LoginRateLimit()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Candidate login at a centre exam',
    description:
      'Allowed only when the candidate is mapped to this centre for the current date.',
  })
  async login(@Body() dto: CandidateLoginDto) {
    return apiSuccess(
      'Logged in successfully',
      await this.candidatesAuthService.login(dto),
    );
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh candidate tokens' })
  async refresh(@Body() dto: CandidateRefreshTokenDto) {
    return apiSuccess(
      'Token refreshed successfully',
      await this.candidatesAuthService.refresh(dto.refreshToken),
    );
  }

  @CandidateAuth()
  @ApiBearerAuth('CandidateJWT')
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout() {
    await this.candidatesAuthService.logout(this.companyContext.getUserId());
    return apiSuccessMessage('Logged out successfully');
  }

  @CandidateAuth()
  @ApiBearerAuth('CandidateJWT')
  @Get('me')
  async me() {
    return apiSuccess(
      'Profile retrieved successfully',
      await this.candidatesAuthService.me(this.companyContext.getUserId()),
    );
  }

  @Post()
  create(@Body() createCandidateDto: CreateCandidateDto) {
    return this.candidatesService.create(createCandidateDto);
  }

  @Get()
  findAll(@Query() query: QueryCandidateDto) {
    return this.candidatesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', UuidParamPipe) id: string) {
    return this.candidatesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', UuidParamPipe) id: string,
    @Body() updateCandidateDto: UpdateCandidateDto,
  ) {
    return this.candidatesService.update(id, updateCandidateDto);
  }

  @Delete(':id')
  remove(@Param('id', UuidParamPipe) id: string) {
    return this.candidatesService.remove(id);
  }
}
