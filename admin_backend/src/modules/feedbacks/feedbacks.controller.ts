import { Body, Controller, Param, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiExtraModels,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiUnauthorizedResponse,
  getSchemaPath,
} from '@nestjs/swagger';
import { CandidateAuth } from '../../common/decorators/candidate-auth.decorator';
import { UuidParamPipe } from '../../common/pipes/uuid-param.pipe';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { FeedbackResponseDto } from './dto/feedback.swagger';
import { FeedbacksService } from './feedbacks.service';

const feedbackResponseExample = {
  success: true,
  message: 'Feedback submitted successfully',
  data: {
    id: 'f3a1c8e0-6b42-4d17-9a55-2c80e71b4d09',
    studentId: 'b7a265f4-8a3d-4c1d-a7b2-605d490ee7b5',
    companyId: 'd6db8101-876c-43ac-8124-4a368bbb4de0',
    testId: '221c95a0-b9d7-47c0-93e9-f69ccf6a98f5',
    rating: 5,
    comment: 'The instructions were clear.',
    createdAt: '2026-10-09T03:00:00.000Z',
    updatedAt: '2026-10-09T03:00:00.000Z',
  },
};

@ApiTags('Candidates')
@ApiBearerAuth('CandidateJWT')
@CandidateAuth()
@Controller('candidates/tests')
export class FeedbacksController {
  constructor(private readonly feedbacksService: FeedbacksService) {}

  @Post(':testId/feedback')
  @ApiExtraModels(FeedbackResponseDto)
  @ApiOperation({
    summary: 'Submit feedback for a test',
    description:
      'Candidate auth only. studentId and companyId come from the access token. rating is required and must be from 1 to 5. comment is optional. A candidate can submit one feedback for a test.',
  })
  @ApiParam({
    name: 'testId',
    format: 'uuid',
    description: 'Active test the candidate is mapped to.',
  })
  @ApiCreatedResponse({
    description: 'Saved feedback. comment is null when it was not sent.',
    content: {
      'application/json': {
        schema: { $ref: getSchemaPath(FeedbackResponseDto) },
        example: feedbackResponseExample,
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: 'Candidate access token is missing or no longer valid.',
  })
  @ApiForbiddenResponse({ description: 'You are not mapped to this test.' })
  @ApiNotFoundResponse({ description: 'Test not found.' })
  @ApiConflictResponse({
    description: 'You have already submitted feedback for this test.',
  })
  create(
    @Param('testId', UuidParamPipe) testId: string,
    @Body() dto: CreateFeedbackDto,
  ) {
    return this.feedbacksService.create(testId, dto);
  }
}
