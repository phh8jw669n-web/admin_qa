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
import { CandidateCentreMappingsService } from './candidate-centre-mappings.service';
import { CreateCandidateCentreMappingDto } from './dto/create-candidate-centre-mapping.dto';
import { QueryCandidateCentreMappingDto } from './dto/query-candidate-centre-mapping.dto';
import { UpdateCandidateCentreMappingDto } from './dto/update-candidate-centre-mapping.dto';

@ApiTags('Candidate Centre Mappings')
@ApiBearerAuth('JWT')
@Controller('candidate-centre-mappings')
export class CandidateCentreMappingsController {
  constructor(
    private readonly candidateCentreMappingsService: CandidateCentreMappingsService,
  ) {}

  @Post()
  create(@Body() dto: CreateCandidateCentreMappingDto) {
    return this.candidateCentreMappingsService.create(dto);
  }

  @Get()
  findAll(@Query() query: QueryCandidateCentreMappingDto) {
    return this.candidateCentreMappingsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', UuidParamPipe) id: string) {
    return this.candidateCentreMappingsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', UuidParamPipe) id: string,
    @Body() dto: UpdateCandidateCentreMappingDto,
  ) {
    return this.candidateCentreMappingsService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', UuidParamPipe) id: string) {
    return this.candidateCentreMappingsService.remove(id);
  }
}
