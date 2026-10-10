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
import { DifficultiesService } from './difficulties.service';
import { CreateDifficultyDto } from './dto/create-difficulty.dto';
import { QueryDifficultyDto } from './dto/query-difficulty.dto';
import { UpdateDifficultyDto } from './dto/update-difficulty.dto';
import { UpdateDifficultyStatusDto } from './dto/update-difficulty-status.dto';

@ApiTags('Difficulties')
@ApiBearerAuth('JWT')
@Controller('difficulties')
export class DifficultiesController {
  constructor(private readonly difficultiesService: DifficultiesService) {}

  @Post()
  create(@Body() createDifficultyDto: CreateDifficultyDto) {
    return this.difficultiesService.create(createDifficultyDto);
  }

  @Get()
  findAll(@Query() query: QueryDifficultyDto) {
    return this.difficultiesService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', UuidParamPipe) id: string) {
    return this.difficultiesService.findOne(id);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id', UuidParamPipe) id: string,
    @Body() updateDifficultyStatusDto: UpdateDifficultyStatusDto,
  ) {
    return this.difficultiesService.updateStatus(id, updateDifficultyStatusDto);
  }

  @Patch(':id')
  update(
    @Param('id', UuidParamPipe) id: string,
    @Body() updateDifficultyDto: UpdateDifficultyDto,
  ) {
    return this.difficultiesService.update(id, updateDifficultyDto);
  }

  @Delete(':id')
  remove(@Param('id', UuidParamPipe) id: string) {
    return this.difficultiesService.remove(id);
  }
}
