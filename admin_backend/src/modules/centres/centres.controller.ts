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
import { CreateCentreDto } from './dto/create-centre.dto';
import { QueryCentreDto } from './dto/query-centre.dto';
import { UpdateCentreDto } from './dto/update-centre.dto';
import { CentresService } from './centres.service';

@ApiTags('Centres')
@ApiBearerAuth('JWT')
@Controller('centres')
export class CentresController {
  constructor(private readonly centresService: CentresService) {}

  @Post()
  create(@Body() createCentreDto: CreateCentreDto) {
    return this.centresService.create(createCentreDto);
  }

  @Get()
  findAll(@Query() query: QueryCentreDto) {
    return this.centresService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', UuidParamPipe) id: string) {
    return this.centresService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', UuidParamPipe) id: string,
    @Body() updateCentreDto: UpdateCentreDto,
  ) {
    return this.centresService.update(id, updateCentreDto);
  }

  @Delete(':id')
  remove(@Param('id', UuidParamPipe) id: string) {
    return this.centresService.remove(id);
  }
}
