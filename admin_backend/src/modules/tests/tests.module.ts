import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesModule } from '../categories/categories.module';
import { InstructionsModule } from '../instructions/instructions.module';
import { Question } from '../questions/entities/question.entity';
import { TemplatesModule } from '../templates/templates.module';
import { Test } from './entities/test.entity';
import { TestsController } from './tests.controller';
import { TestsService } from './tests.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Test, Question]),
    CategoriesModule,
    InstructionsModule,
    TemplatesModule,
  ],
  controllers: [TestsController],
  providers: [TestsService],
  exports: [TestsService],
})
export class TestsModule {}
