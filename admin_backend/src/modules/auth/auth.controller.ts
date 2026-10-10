import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CompanyContextService } from '../../common/auth/company-context.service';
import { LoginRateLimit } from '../../common/decorators/login-rate-limit.decorator';
import { Public } from '../../common/decorators/public.decorator';
import {
  apiSuccess,
  apiSuccessMessage,
} from '../../common/utils/api-response.util';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly companyContext: CompanyContextService,
  ) {}

  @Public()
  @LoginRateLimit()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() loginDto: LoginDto) {
    return apiSuccess(
      'Logged in successfully',
      await this.authService.login(loginDto),
    );
  }

  @Public()
  @Post('refresh')
  async refresh(@Body() refreshTokenDto: RefreshTokenDto) {
    return apiSuccess(
      'Token refreshed successfully',
      await this.authService.refresh(refreshTokenDto.refreshToken),
    );
  }

  @ApiBearerAuth('JWT')
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout() {
    await this.authService.logout(this.companyContext.getUserId());
    return apiSuccessMessage('Logged out successfully');
  }

  @ApiBearerAuth('JWT')
  @Get('me')
  async me() {
    return apiSuccess(
      'Profile retrieved successfully',
      await this.authService.me(this.companyContext.getUserId()),
    );
  }
}
