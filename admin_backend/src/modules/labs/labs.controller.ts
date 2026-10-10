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
import { CreateLabDto } from './dto/create-lab.dto';
import { QueryLabDto } from './dto/query-lab.dto';
import { UpdateLabDto } from './dto/update-lab.dto';
import { LabsService } from './labs.service';

@ApiTags('Labs')
@ApiBearerAuth('JWT')
@Controller('labs')
export class LabsController {
  constructor(private readonly labsService: LabsService) {}

  @Post()
  create(@Body() createLabDto: CreateLabDto) {
    return this.labsService.create(createLabDto);
  }

  @Get()
  findAll(@Query() query: QueryLabDto) {
    return this.labsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', UuidParamPipe) id: string) {
    return this.labsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', UuidParamPipe) id: string,
    @Body() updateLabDto: UpdateLabDto,
  ) {
    return this.labsService.update(id, updateLabDto);
  }

  @Delete(':id')
  remove(@Param('id', UuidParamPipe) id: string) {
    return this.labsService.remove(id);
  }
}
