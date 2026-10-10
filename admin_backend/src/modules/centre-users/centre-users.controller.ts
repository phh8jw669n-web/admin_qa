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
import { CentreAuth } from '../../common/decorators/centre-auth.decorator';
import { LoginRateLimit } from '../../common/decorators/login-rate-limit.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UuidParamPipe } from '../../common/pipes/uuid-param.pipe';
import {
  apiSuccess,
  apiSuccessMessage,
} from '../../common/utils/api-response.util';
import { CentreUsersAuthService } from './centre-users-auth.service';
import { CentreUsersService } from './centre-users.service';
import { CentreUserLoginDto } from './dto/centre-user-login.dto';
import { CentreUserRefreshTokenDto } from './dto/centre-user-refresh-token.dto';
import { CreateCentreUserDto } from './dto/create-centre-user.dto';
import { QueryCentreUserDto } from './dto/query-centre-user.dto';
import { UpdateCentreUserDto } from './dto/update-centre-user.dto';

@ApiTags('Centre Users')
@Controller('centre-users')
export class CentreUsersController {
  constructor(
    private readonly centreUsersService: CentreUsersService,
    private readonly centreUsersAuthService: CentreUsersAuthService,
    private readonly companyContext: CompanyContextService,
  ) {}

  @Public()
  @LoginRateLimit()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Centre user login' })
  async login(@Body() dto: CentreUserLoginDto) {
    return apiSuccess(
      'Logged in successfully',
      await this.centreUsersAuthService.login(dto),
    );
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Refresh centre user tokens' })
  async refresh(@Body() dto: CentreUserRefreshTokenDto) {
    return apiSuccess(
      'Token refreshed successfully',
      await this.centreUsersAuthService.refresh(dto.refreshToken),
    );
  }

  @CentreAuth()
  @ApiBearerAuth('CentreJWT')
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout() {
    await this.centreUsersAuthService.logout(this.companyContext.getUserId());
    return apiSuccessMessage('Logged out successfully');
  }

  @CentreAuth()
  @ApiBearerAuth('CentreJWT')
  @Get('me')
  async me() {
    return apiSuccess(
      'Profile retrieved successfully',
      await this.centreUsersAuthService.me(this.companyContext.getUserId()),
    );
  }

  @ApiBearerAuth('JWT')
  @Post()
  async create(@Body() dto: CreateCentreUserDto) {
    return apiSuccess(
      'Centre user created successfully',
      await this.centreUsersService.create(dto),
    );
  }

  @ApiBearerAuth('JWT')
  @Get()
  async findAll(@Query() query: QueryCentreUserDto) {
    return apiSuccess(
      'Centre users fetched successfully',
      await this.centreUsersService.findAll(query),
    );
  }

  @ApiBearerAuth('JWT')
  @Get(':id')
  async findOne(@Param('id', UuidParamPipe) id: string) {
    return apiSuccess(
      'Centre user fetched successfully',
      await this.centreUsersService.findOne(id),
    );
  }

  @ApiBearerAuth('JWT')
  @Patch(':id')
  async update(
    @Param('id', UuidParamPipe) id: string,
    @Body() dto: UpdateCentreUserDto,
  ) {
    return apiSuccess(
      'Centre user updated successfully',
      await this.centreUsersService.update(id, dto),
    );
  }

  @ApiBearerAuth('JWT')
  @Delete(':id')
  async remove(@Param('id', UuidParamPipe) id: string) {
    await this.centreUsersService.remove(id);
    return apiSuccessMessage('Centre user deleted successfully');
  }
}
