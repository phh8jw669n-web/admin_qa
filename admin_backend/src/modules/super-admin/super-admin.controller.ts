import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CompanyContextService } from '../../common/auth/company-context.service';
import { LoginRateLimit } from '../../common/decorators/login-rate-limit.decorator';
import { Public } from '../../common/decorators/public.decorator';
import {
  apiSuccess,
  apiSuccessMessage,
} from '../../common/utils/api-response.util';
import { SuperAdminLoginDto } from './dto/login.dto';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { SuperAdminAuthService } from './super-admin-auth.service';

@ApiTags('Super-Admin')
@Controller('super-admin')
export class SuperAdminController {
  constructor(
    private readonly superAdminAuthService: SuperAdminAuthService,
    private readonly companyContext: CompanyContextService,
  ) {}

  @Public()
  @LoginRateLimit()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: SuperAdminLoginDto) {
    return apiSuccess(
      'Super-Admin logged in successfully',
      await this.superAdminAuthService.login(dto),
    );
  }

  @ApiBearerAuth('JWT')
  @UseGuards(SuperAdminGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout() {
    await this.superAdminAuthService.logout(this.companyContext.getUserId());
    return apiSuccessMessage('Logged out successfully');
  }
}
