import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from '../../modules/admins/entities/admin.entity';
import { SuperAdminSeederService } from './super-admin-seeder.service';

@Module({
  imports: [TypeOrmModule.forFeature([Admin])],
  providers: [SuperAdminSeederService],
  exports: [SuperAdminSeederService],
})
export class SuperAdminSeedModule {}
