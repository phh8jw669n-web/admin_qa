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
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiTags,
  getSchemaPath,
} from '@nestjs/swagger';
import { UuidParamPipe } from '../../common/pipes/uuid-param.pipe';
import { CreateTestDto } from './dto/create-test.dto';
import {
  PublishTestScheduleDto,
  updateTestExamples,
} from './dto/publish-test.swagger';
import { QueryTestDto } from './dto/query-test.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import { TestsService } from './tests.service';

@ApiTags('Tests')
@ApiBearerAuth('JWT')
@Controller('tests')
export class TestsController {
  constructor(private readonly testsService: TestsService) {}

  @Post()
  create(@Body() createTestDto: CreateTestDto) {
    return this.testsService.create(createTestDto);
  }

  @Get()
  findAll(@Query() query: QueryTestDto) {
    return this.testsService.findAll(query);
  }

  @Get(':id/stats')
  getQuestionStats(@Param('id', UuidParamPipe) id: string) {
    return this.testsService.getQuestionStats(id);
  }

  @Get(':id')
  findOne(@Param('id', UuidParamPipe) id: string) {
    return this.testsService.findOne(id);
  }

  @Patch(':id')
  @ApiExtraModels(UpdateTestDto, PublishTestScheduleDto)
  @ApiBody({
    schema: {
      oneOf: [
        { $ref: getSchemaPath(UpdateTestDto) },
        { $ref: getSchemaPath(PublishTestScheduleDto) },
      ],
    },
    examples: updateTestExamples,
  })
  update(
    @Param('id', UuidParamPipe) id: string,
    @Body() updateTestDto: UpdateTestDto,
  ) {
    return this.testsService.update(id, updateTestDto);
  }

  @Delete(':id')
  remove(@Param('id', UuidParamPipe) id: string) {
    return this.testsService.remove(id);
  }
}
