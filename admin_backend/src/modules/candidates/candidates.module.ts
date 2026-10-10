import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CandidateCentreMappingsModule } from '../candidate-centre-mappings/candidate-centre-mappings.module';
import { CentresModule } from '../centres/centres.module';
import { CompaniesModule } from '../companies/companies.module';
import { GroupsModule } from '../groups/groups.module';
import { CandidatesAuthService } from './candidates-auth.service';
import { CandidatesController } from './candidates.controller';
import { CandidatesService } from './candidates.service';
import { DocumentsModule } from './documents/documents.module';
import { CandidateCentreMapping } from '../candidate-centre-mappings/entities/candidate-centre-mapping.entity';
import { InstructionLanguage } from '../instructions/instruction-languages/entities/instruction-language.entity';
import { QuestionContent } from '../questions/entities/question-content.entity';
import { Question } from '../questions/entities/question.entity';
import { TestCandidateMapping } from '../test-candidate-mappings/entities/test-candidate-mapping.entity';
import { TestSetting } from '../test-settings/entities/test-setting.entity';
import { Test } from '../tests/entities/test.entity';
import { CandidateExamController } from './candidate-exam.controller';
import { CandidateExamService } from './candidate-exam.service';
import { Candidate } from './entities/candidate.entity';
import { CandidateJwtAuthGuard } from './guards/candidate-jwt-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Candidate,
      CandidateCentreMapping,
      Test,
      TestCandidateMapping,
      TestSetting,
      InstructionLanguage,
      Question,
      QuestionContent,
    ]),
    GroupsModule,
    DocumentsModule,
    CompaniesModule,
    CentresModule,
    CandidateCentreMappingsModule,
  ],
  controllers: [CandidatesController, CandidateExamController],
  providers: [
    CandidatesService,
    CandidatesAuthService,
    CandidateExamService,
    {
      provide: APP_GUARD,
      useClass: CandidateJwtAuthGuard,
    },
  ],
  exports: [CandidatesService],
})
export class CandidatesModule {}
