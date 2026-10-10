import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CentresModule } from '../centres/centres.module';
import { RegionsModule } from '../regions/regions.module';
import { Lab } from './entities/lab.entity';
import { LabsController } from './labs.controller';
import { LabsService } from './labs.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Lab]),
    RegionsModule,
    CentresModule,
  ],
  controllers: [LabsController],
  providers: [LabsService],
  exports: [LabsService],
})
export class LabsModule {}
