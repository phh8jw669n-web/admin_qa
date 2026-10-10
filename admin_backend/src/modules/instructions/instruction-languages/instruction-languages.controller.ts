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
import { CreateInstructionLanguageDto } from './dto/create-instruction-language.dto';
import { QueryInstructionLanguageDto } from './dto/query-instruction-language.dto';
import { UpdateInstructionLanguageDto } from './dto/update-instruction-language.dto';
import { InstructionLanguagesService } from './instruction-languages.service';

@ApiTags('Instruction-Languages')
@ApiBearerAuth('JWT')
@Controller('instructions/:instructionId/languages')
export class InstructionLanguagesController {
  constructor(
    private readonly instructionLanguagesService: InstructionLanguagesService,
  ) {}

  @Post()
  create(
    @Param('instructionId', UuidParamPipe) instructionId: string,
    @Body() createDto: CreateInstructionLanguageDto,
  ) {
    return this.instructionLanguagesService.create(instructionId, createDto);
  }

  @Get()
  findAll(
    @Param('instructionId', UuidParamPipe) instructionId: string,
    @Query() query: QueryInstructionLanguageDto,
  ) {
    return this.instructionLanguagesService.findAll(instructionId, query);
  }

  @Get(':id')
  findOne(
    @Param('instructionId', UuidParamPipe) instructionId: string,
    @Param('id', UuidParamPipe) id: string,
  ) {
    return this.instructionLanguagesService.findOne(instructionId, id);
  }

  @Patch(':id')
  update(
    @Param('instructionId', UuidParamPipe) instructionId: string,
    @Param('id', UuidParamPipe) id: string,
    @Body() updateDto: UpdateInstructionLanguageDto,
  ) {
    return this.instructionLanguagesService.update(
      instructionId,
      id,
      updateDto,
    );
  }

  @Delete(':id')
  remove(
    @Param('instructionId', UuidParamPipe) instructionId: string,
    @Param('id', UuidParamPipe) id: string,
  ) {
    return this.instructionLanguagesService.remove(instructionId, id);
  }
}
