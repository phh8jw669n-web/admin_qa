import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { CandidateAuth } from '../../common/decorators/candidate-auth.decorator';
import { UuidParamPipe } from '../../common/pipes/uuid-param.pipe';
import { CandidateExamService } from './candidate-exam.service';
import { examDetailsResponseExample } from './dto/exam-details.example';
import { ExamDetailsResponseDto } from './dto/exam-details.swagger';
import { examPaperResponseExample } from './dto/exam-paper.example';
import {
  ExamChoiceOptionsResponseDto,
  ExamFillOptionsResponseDto,
  ExamPaperResponseDto,
} from './dto/exam-paper.swagger';

@ApiTags('Candidates')
@ApiBearerAuth('CandidateJWT')
@CandidateAuth()
@Controller('candidates/tests')
export class CandidateExamController {
  constructor(private readonly candidateExamService: CandidateExamService) {}

  @Get(':testId/questions')
  @ApiExtraModels(
    ExamPaperResponseDto,
    ExamChoiceOptionsResponseDto,
    ExamFillOptionsResponseDto,
  )
  @ApiOperation({
    summary: 'Fetch exam questions for a test',
    description:
      'Candidate auth only. Questions are grouped by subject. Each topic inside a subject is one section. Every language is included. A comprehension includes its child questions. Correct answers are not returned.',
  })
  @ApiParam({
    name: 'testId',
    format: 'uuid',
    description: 'Active test the candidate is mapped to.',
  })
  @ApiOkResponse({
    description:
      'Grammar has two topics, so two sections. Physics starts again at section 1. The paper includes single choice, multiple choice, fill in the blanks, and a comprehension whose children are single choice and fill in the blanks. Each questionData item is one language.',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(ExamPaperResponseDto) },
        example: examPaperResponseExample,
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Candidate access token is missing or no longer valid.',
  })
  @ApiForbiddenResponse({ description: 'You are not mapped to this test.' })
  @ApiNotFoundResponse({ description: 'Test not found.' })
  findQuestions(@Param('testId', UuidParamPipe) testId: string) {
    return this.candidateExamService.findPaper(testId);
  }

  @Get(':testId')
  @ApiExtraModels(ExamDetailsResponseDto)
  @ApiOperation({
    summary: 'Fetch exam details for a test',
    description:
      'Candidate auth only. Returns the test, the category name, every instruction language for primaryInstructionId, and the test settings. The same details are reused for every mapped candidate.',
  })
  @ApiParam({
    name: 'testId',
    format: 'uuid',
    description: 'Active test the candidate is mapped to.',
  })
  @ApiOkResponse({
    description:
      'instructions has one item per language. settings is null when the test has no settings row. categoryName comes from categoryId.',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(ExamDetailsResponseDto) },
        example: examDetailsResponseExample,
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Candidate access token is missing or no longer valid.',
  })
  @ApiForbiddenResponse({ description: 'You are not mapped to this test.' })
  @ApiNotFoundResponse({ description: 'Test not found.' })
  findDetails(@Param('testId', UuidParamPipe) testId: string) {
    return this.candidateExamService.findDetails(testId);
  }
}
