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
import { UuidParamPipe } from '../../../common/pipes/uuid-param.pipe';
import { DocumentsService } from './documents.service';
import { CreateDocumentDto } from './dto/create-document.dto';
import { QueryDocumentDto } from './dto/query-document.dto';
import { UpdateDocumentDto } from './dto/update-document.dto';

@ApiTags('Candidate-Documents')
@ApiBearerAuth('JWT')
@Controller('candidates/:candidateId/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post()
  create(
    @Param('candidateId', UuidParamPipe) candidateId: string,
    @Body() createDocumentDto: CreateDocumentDto,
  ) {
    return this.documentsService.create(candidateId, createDocumentDto);
  }

  @Get()
  findAll(
    @Param('candidateId', UuidParamPipe) candidateId: string,
    @Query() query: QueryDocumentDto,
  ) {
    return this.documentsService.findAll(candidateId, query);
  }

  @Get(':id')
  findOne(
    @Param('candidateId', UuidParamPipe) candidateId: string,
    @Param('id', UuidParamPipe) id: string,
  ) {
    return this.documentsService.findOne(candidateId, id);
  }

  @Patch(':id')
  update(
    @Param('candidateId', UuidParamPipe) candidateId: string,
    @Param('id', UuidParamPipe) id: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
  ) {
    return this.documentsService.update(candidateId, id, updateDocumentDto);
  }

  @Delete(':id')
  remove(
    @Param('candidateId', UuidParamPipe) candidateId: string,
    @Param('id', UuidParamPipe) id: string,
  ) {
    return this.documentsService.remove(candidateId, id);
  }
}
