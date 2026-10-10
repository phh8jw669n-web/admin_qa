import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UuidParamPipe } from '../../common/pipes/uuid-param.pipe';
import { CreateTestSettingDto } from './dto/create-test-setting.dto';
import { UpdateTestSettingDto } from './dto/update-test-setting.dto';
import { TestSettingsService } from './test-settings.service';

@ApiTags('Test-Settings')
@ApiBearerAuth('JWT')
@Controller('test-settings')
export class TestSettingsController {
  constructor(private readonly testSettingsService: TestSettingsService) {}

  @Post()
  create(@Body() createTestSettingDto: CreateTestSettingDto) {
    return this.testSettingsService.create(createTestSettingDto);
  }

  @Get('test/:testId')
  findOneByTestId(@Param('testId', UuidParamPipe) testId: string) {
    return this.testSettingsService.findOneByTestId(testId);
  }

  @Get(':id')
  findOne(@Param('id', UuidParamPipe) id: string) {
    return this.testSettingsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', UuidParamPipe) id: string,
    @Body() updateTestSettingDto: UpdateTestSettingDto,
  ) {
    return this.testSettingsService.update(id, updateTestSettingDto);
  }

  @Delete(':id')
  remove(@Param('id', UuidParamPipe) id: string) {
    return this.testSettingsService.remove(id);
  }
}
