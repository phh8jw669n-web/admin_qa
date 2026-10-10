import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RegionsModule } from '../regions/regions.module';
import { CentresController } from './centres.controller';
import { CentresService } from './centres.service';
import { Centre } from './entities/centre.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Centre]), RegionsModule],
  controllers: [CentresController],
  providers: [CentresService],
  exports: [CentresService],
})
export class CentresModule {}
