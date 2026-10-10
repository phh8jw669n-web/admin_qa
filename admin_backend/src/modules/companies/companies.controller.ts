import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CompanyContextService } from '../../common/auth/company-context.service';
import { Public } from '../../common/decorators/public.decorator';
import { UuidParamPipe } from '../../common/pipes/uuid-param.pipe';
import { apiSuccess } from '../../common/utils/api-response.util';
import { CompaniesService } from './companies.service';
import { UpdateOwnCompanyDto } from './dto/update-own-company.dto';
import {
  VerifyWorkspaceDto,
  WorkspaceVerifyResponseDto,
} from './dto/verify-workspace.dto';

@ApiTags('Companies')
@Controller('companies')
export class CompaniesController {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly companyContext: CompanyContextService,
  ) {}

  @Public()
  @Post('verify-workspace')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify workspace URL',
    description:
      'Allows access when the exact workspace URL exists on an active company. Returns a company JWT plus name, logo, favicon, and brand colors.',
  })
  @ApiResponse({
    status: 200,
    description: 'Workspace verified successfully',
    type: WorkspaceVerifyResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid workspace or company is not active',
  })
  @ApiResponse({
    status: 403,
    description: 'Company plan has expired',
  })
  async verifyWorkspace(@Body() dto: VerifyWorkspaceDto) {
    return apiSuccess(
      'Workspace verified successfully',
      await this.companiesService.verifyWorkspace(dto),
    );
  }

  @ApiBearerAuth('JWT')
  @Get(':id')
  async findOne(@Param('id', UuidParamPipe) id: string) {
    return apiSuccess(
      'Company fetched successfully',
      await this.companiesService.findOneForCompany(
        id,
        this.companyContext.getCompanyId(),
      ),
    );
  }

  @ApiBearerAuth('JWT')
  @Patch(':id')
  async update(
    @Param('id', UuidParamPipe) id: string,
    @Body() updateOwnCompanyDto: UpdateOwnCompanyDto,
  ) {
    return apiSuccess(
      'Company updated successfully',
      await this.companiesService.updateForCompany(
        id,
        this.companyContext.getCompanyId(),
        updateOwnCompanyDto,
      ),
    );
  }
}
