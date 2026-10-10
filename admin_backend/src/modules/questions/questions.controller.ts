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
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { UuidParamPipe } from '../../common/pipes/uuid-param.pipe';
import { CreateQuestionDto } from './dto/create-question.dto';
import { createQuestionExamples } from './dto/create-question.examples';
import {
  FillInTheBlanksOptionsDto,
  MultipleChoiceOptionsDto,
  SingleChoiceOptionsDto,
} from './dto/question-options.swagger';
import { QueryQuestionDto } from './dto/query-question.dto';
import { UpdateQuestionDto } from './dto/update-question.dto';
import { QuestionsService } from './questions.service';

@ApiTags('Questions')
@ApiBearerAuth('JWT')
@Controller('questions')
export class QuestionsController {
  constructor(private readonly questionsService: QuestionsService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a question',
    description:
      'Use the Examples dropdown to load a body for single choice, multiple choice, fill in the blanks, or comprehension. In the schema, fields without Optional in the description are required.',
  })
  @ApiExtraModels(
    SingleChoiceOptionsDto,
    MultipleChoiceOptionsDto,
    FillInTheBlanksOptionsDto,
  )
  @ApiBody({
    type: CreateQuestionDto,
    examples: createQuestionExamples,
  })
  create(@Body() createQuestionDto: CreateQuestionDto) {
    return this.questionsService.create(createQuestionDto);
  }

  @Get()
  findAll(@Query() query: QueryQuestionDto) {
    return this.questionsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', UuidParamPipe) id: string) {
    return this.questionsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Update a question',
    description:
      'Every field is optional. questionData replaces the language rows: include id to update a language, omit id to add one, and leave a language out to delete it. childQuestions replaces the comprehension children the same way and is allowed only when the question is a comprehension.',
  })
  update(
    @Param('id', UuidParamPipe) id: string,
    @Body() updateQuestionDto: UpdateQuestionDto,
  ) {
    return this.questionsService.update(id, updateQuestionDto);
  }

  @Delete(':id')
  remove(@Param('id', UuidParamPipe) id: string) {
    return this.questionsService.remove(id);
  }
}
