import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CandidatesModule } from '../candidates/candidates.module';
import { GroupsModule } from '../groups/groups.module';
import { TestsModule } from '../tests/tests.module';
import { TestCandidateMapping } from './entities/test-candidate-mapping.entity';
import { TestCandidateMappingsController } from './test-candidate-mappings.controller';
import { TestCandidateMappingsService } from './test-candidate-mappings.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([TestCandidateMapping]),
    GroupsModule,
    CandidatesModule,
    TestsModule,
  ],
  controllers: [TestCandidateMappingsController],
  providers: [TestCandidateMappingsService],
  exports: [TestCandidateMappingsService],
})
export class TestCandidateMappingsModule {}
