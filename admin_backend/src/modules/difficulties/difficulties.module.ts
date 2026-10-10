import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LanguagesModule } from '../languages/languages.module';
import { DifficultiesController } from './difficulties.controller';
import { DifficultiesService } from './difficulties.service';
import { Difficulty } from './entities/difficulty.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Difficulty]), LanguagesModule],
  controllers: [DifficultiesController],
  providers: [DifficultiesService],
  exports: [DifficultiesService],
})
export class DifficultiesModule {}
