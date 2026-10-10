import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DifficultiesModule } from '../difficulties/difficulties.module';
import { LanguagesModule } from '../languages/languages.module';
import { SubjectsModule } from '../subjects/subjects.module';
import { TestsModule } from '../tests/tests.module';
import { TopicsModule } from '../topics/topics.module';
import { QuestionContent } from './entities/question-content.entity';
import { Question } from './entities/question.entity';
import { QuestionsController } from './questions.controller';
import { QuestionsService } from './questions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Question, QuestionContent]),
    TestsModule,
    SubjectsModule,
    TopicsModule,
    LanguagesModule,
    DifficultiesModule,
  ],
  controllers: [QuestionsController],
  providers: [QuestionsService],
  exports: [QuestionsService],
})
export class QuestionsModule {}
