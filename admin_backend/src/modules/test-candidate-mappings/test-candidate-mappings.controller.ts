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
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UuidParamPipe } from '../../common/pipes/uuid-param.pipe';
import { AssignTestEmailDto } from './dto/assign-test-email.dto';
import { AssignTestGroupsDto } from './dto/assign-test-groups.dto';
import { CreateTestCandidateMappingDto } from './dto/create-test-candidate-mapping.dto';
import { QueryTestCandidateMappingDto } from './dto/query-test-candidate-mapping.dto';
import { UpdateTestCandidateMappingDto } from './dto/update-test-candidate-mapping.dto';
import { TestCandidateMappingsService } from './test-candidate-mappings.service';

@ApiTags('Test-Candidate-Mappings')
@ApiBearerAuth('JWT')
@Controller('test-candidate-mappings')
export class TestCandidateMappingsController {
  constructor(
    private readonly mappingsService: TestCandidateMappingsService,
  ) {}

  @Post('assign-groups')
  @ApiOperation({
    summary: 'Assign a test to every candidate in the selected groups',
  })
  assignGroups(@Body() dto: AssignTestGroupsDto) {
    return this.mappingsService.assignGroups(dto);
  }

  @Post('assign-email')
  @ApiOperation({
    summary: 'Assign a test to candidates by comma-separated emails',
  })
  assignEmail(@Body() dto: AssignTestEmailDto) {
    return this.mappingsService.assignEmail(dto);
  }

  @Post()
  create(@Body() createDto: CreateTestCandidateMappingDto) {
    return this.mappingsService.create(createDto);
  }

  @Get()
  findAll(@Query() query: QueryTestCandidateMappingDto) {
    return this.mappingsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', UuidParamPipe) id: string) {
    return this.mappingsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', UuidParamPipe) id: string,
    @Body() updateDto: UpdateTestCandidateMappingDto,
  ) {
    return this.mappingsService.update(id, updateDto);
  }

  @Delete(':id')
  remove(@Param('id', UuidParamPipe) id: string) {
    return this.mappingsService.remove(id);
  }
}
