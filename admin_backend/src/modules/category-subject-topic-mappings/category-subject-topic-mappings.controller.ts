import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UuidParamPipe } from '../../common/pipes/uuid-param.pipe';
import { CategorySubjectTopicMappingsService } from './category-subject-topic-mappings.service';
import { CreateCategorySubjectTopicMappingDto } from './dto/create-category-subject-topic-mapping.dto';
import { QueryCategorySubjectTopicMappingDto } from './dto/query-category-subject-topic-mapping.dto';
import { UpdateCategorySubjectTopicMappingDto } from './dto/update-category-subject-topic-mapping.dto';

@ApiTags('Category-Subject-Topic-Mappings')
@ApiBearerAuth('JWT')
@Controller('category-subject-topic-mappings')
export class CategorySubjectTopicMappingsController {
  constructor(
    private readonly mappingsService: CategorySubjectTopicMappingsService,
  ) {}

  @Post()
  create(@Body() createDto: CreateCategorySubjectTopicMappingDto) {
    return this.mappingsService.create(createDto);
  }

  @Get()
  findAll(@Query() query: QueryCategorySubjectTopicMappingDto) {
    return this.mappingsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', UuidParamPipe) id: string) {
    return this.mappingsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', UuidParamPipe) id: string,
    @Body() updateDto: UpdateCategorySubjectTopicMappingDto,
  ) {
    return this.mappingsService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', UuidParamPipe) id: string) {
    return this.mappingsService.remove(id);
  }
}
