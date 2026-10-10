import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesModule } from '../categories/categories.module';
import { CategorySubjectTopicMapping } from '../category-subject-topic-mappings/entities/category-subject-topic-mapping.entity';
import { LanguagesModule } from '../languages/languages.module';
import { SubjectsModule } from '../subjects/subjects.module';
import { Topic } from './entities/topic.entity';
import { TopicsController } from './topics.controller';
import { TopicsService } from './topics.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Topic, CategorySubjectTopicMapping]),
    LanguagesModule,
    CategoriesModule,
    SubjectsModule,
  ],
  controllers: [TopicsController],
  providers: [TopicsService],
  exports: [TopicsService],
})
export class TopicsModule {}
