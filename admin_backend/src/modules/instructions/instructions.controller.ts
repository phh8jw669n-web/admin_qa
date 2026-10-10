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
import { CreateInstructionDto } from './dto/create-instruction.dto';
import { QueryInstructionDto } from './dto/query-instruction.dto';
import { UpdateInstructionDto } from './dto/update-instruction.dto';
import { InstructionsService } from './instructions.service';

@ApiTags('Instructions')
@ApiBearerAuth('JWT')
@Controller('instructions')
export class InstructionsController {
  constructor(private readonly instructionsService: InstructionsService) {}

  @Post()
  create(@Body() createInstructionDto: CreateInstructionDto) {
    return this.instructionsService.create(createInstructionDto);
  }

  @Get()
  findAll(@Query() query: QueryInstructionDto) {
    return this.instructionsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', UuidParamPipe) id: string) {
    return this.instructionsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', UuidParamPipe) id: string,
    @Body() updateInstructionDto: UpdateInstructionDto,
  ) {
    return this.instructionsService.update(id, updateInstructionDto);
  }

  @Delete(':id')
  remove(@Param('id', UuidParamPipe) id: string) {
    return this.instructionsService.remove(id);
  }
}
