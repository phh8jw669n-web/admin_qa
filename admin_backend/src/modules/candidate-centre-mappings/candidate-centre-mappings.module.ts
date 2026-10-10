import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Candidate } from '../candidates/entities/candidate.entity';
import { CentresModule } from '../centres/centres.module';
import { CandidateCentreMappingsController } from './candidate-centre-mappings.controller';
import { CandidateCentreMappingsService } from './candidate-centre-mappings.service';
import { CandidateCentreMapping } from './entities/candidate-centre-mapping.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([CandidateCentreMapping, Candidate]),
    CentresModule,
  ],
  controllers: [CandidateCentreMappingsController],
  providers: [CandidateCentreMappingsService],
  exports: [CandidateCentreMappingsService],
})
export class CandidateCentreMappingsModule {}