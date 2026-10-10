import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TestsModule } from '../tests/tests.module';
import { TestSetting } from './entities/test-setting.entity';
import { TestSettingsController } from './test-settings.controller';
import { TestSettingsService } from './test-settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([TestSetting]), TestsModule],
  controllers: [TestSettingsController],
  providers: [TestSettingsService],
  exports: [TestSettingsService],
})
export class TestSettingsModule {}
