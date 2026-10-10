import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UuidParamPipe } from '../../common/pipes/uuid-param.pipe';
import {
  apiSuccess,
  apiSuccessMessage,
} from '../../common/utils/api-response.util';
import { SuperAdminGuard } from '../super-admin/guards/super-admin.guard';
import { CreateTemplateDto } from './dto/create-template.dto';
import { QueryTemplateDto } from './dto/query-template.dto';
import { UpdateTemplateDto } from './dto/update-template.dto';
import { TemplatesService } from './templates.service';

@ApiTags('Templates')
@ApiBearerAuth('JWT')
@Controller('super-admin/templates')
export class TemplatesController {
  constructor(private readonly templatesService: TemplatesService) {}

  @Post()
  @UseGuards(SuperAdminGuard)
  async create(@Body() createTemplateDto: CreateTemplateDto) {
    return apiSuccess(
      'Template created successfully',
      await this.templatesService.create(createTemplateDto),
    );
  }

  @Get()
  async findAll(@Query() query: QueryTemplateDto) {
    return apiSuccess(
      'Templates fetched successfully',
      await this.templatesService.findAll(query),
    );
  }

  @Get(':id')
  async findOne(@Param('id', UuidParamPipe) id: string) {
    return apiSuccess(
      'Template fetched successfully',
      await this.templatesService.findOne(id),
    );
  }

  @Patch(':id')
  @UseGuards(SuperAdminGuard)
  async update(
    @Param('id', UuidParamPipe) id: string,
    @Body() updateTemplateDto: UpdateTemplateDto,
  ) {
    return apiSuccess(
      'Template updated successfully',
      await this.templatesService.update(id, updateTemplateDto),
    );
  }

  @Delete(':id')
  @UseGuards(SuperAdminGuard)
  async remove(@Param('id', UuidParamPipe) id: string) {
    await this.templatesService.remove(id);
    return apiSuccessMessage('Template deleted successfully');
  }
}
