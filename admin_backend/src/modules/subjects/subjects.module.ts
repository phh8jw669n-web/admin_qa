import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesModule } from '../categories/categories.module';
import { CategorySubjectTopicMapping } from '../category-subject-topic-mappings/entities/category-subject-topic-mapping.entity';
import { LanguagesModule } from '../languages/languages.module';
import { Subject } from './entities/subject.entity';
import { SubjectsController } from './subjects.controller';
import { SubjectsService } from './subjects.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Subject, CategorySubjectTopicMapping]),
    LanguagesModule,
    CategoriesModule,
  ],
  controllers: [SubjectsController],
  providers: [SubjectsService],
  exports: [SubjectsService],
})
export class SubjectsModule {}
