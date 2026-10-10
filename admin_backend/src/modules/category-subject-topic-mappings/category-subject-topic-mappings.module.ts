import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesModule } from '../categories/categories.module';
import { SubjectsModule } from '../subjects/subjects.module';
import { TopicsModule } from '../topics/topics.module';
import { CategorySubjectTopicMappingsController } from './category-subject-topic-mappings.controller';
import { CategorySubjectTopicMappingsService } from './category-subject-topic-mappings.service';
import { CategorySubjectTopicMapping } from './entities/category-subject-topic-mapping.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CategorySubjectTopicMapping]),
    CategoriesModule,
    SubjectsModule,
    TopicsModule,
  ],
  controllers: [CategorySubjectTopicMappingsController],
  providers: [CategorySubjectTopicMappingsService],
  exports: [CategorySubjectTopicMappingsService],
})
export class CategorySubjectTopicMappingsModule {}
