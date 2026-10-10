import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UuidParamPipe } from '../../common/pipes/uuid-param.pipe';
import {
  apiSuccess,
  apiSuccessMessage,
} from '../../common/utils/api-response.util';
import { CompaniesService } from '../companies/companies.service';
import { CreateCompanyDto } from '../companies/dto/create-company.dto';
import { QueryCompanyDto } from '../companies/dto/query-company.dto';
import { UpdateCompanyDto } from '../companies/dto/update-company.dto';
import { SuperAdminGuard } from './guards/super-admin.guard';

@ApiTags('Super-Admin-Companies')
@ApiBearerAuth('JWT')
@UseGuards(SuperAdminGuard)
@Controller('super-admin/companies')
export class SuperAdminCompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  async create(@Body() createCompanyDto: CreateCompanyDto) {
    return apiSuccess(
      'Company created successfully',
      await this.companiesService.create(createCompanyDto),
    );
  }

  @Get()
  async findAll(@Query() query: QueryCompanyDto) {
    return apiSuccess(
      'Companies fetched successfully',
      await this.companiesService.findAll(query),
    );
  }

  @Get(':id')
  async findOne(@Param('id', UuidParamPipe) id: string) {
    return apiSuccess(
      'Company fetched successfully',
      await this.companiesService.findCached(id),
    );
  }

  @Put(':id')
  async update(
    @Param('id', UuidParamPipe) id: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ) {
    return apiSuccess(
      'Company updated successfully',
      await this.companiesService.update(id, updateCompanyDto),
    );
  }

  @Delete(':id')
  async remove(@Param('id', UuidParamPipe) id: string) {
    await this.companiesService.remove(id);
    return apiSuccessMessage('Company deleted successfully');
  }
}
