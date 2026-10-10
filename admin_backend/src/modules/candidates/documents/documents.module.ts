import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Candidate } from '../entities/candidate.entity';
import { DocumentsController } from './documents.controller';
import { DocumentsService } from './documents.service';
import { CandidateDocument } from './entities/document.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CandidateDocument, Candidate])],
  controllers: [DocumentsController],
  providers: [DocumentsService],
})
export class DocumentsModule {}
