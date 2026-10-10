import { Module } from '@nestjs/common';
import { AdminsModule } from '../admins/admins.module';
import { AuthModule } from '../auth/auth.module';
import { CompaniesModule } from '../companies/companies.module';
import { SuperAdminGuard } from './guards/super-admin.guard';
import { SuperAdminAuthService } from './super-admin-auth.service';
import { SuperAdminCompaniesController } from './super-admin-companies.controller';
import { SuperAdminController } from './super-admin.controller';

@Module({
  imports: [AdminsModule, AuthModule, CompaniesModule],
  controllers: [SuperAdminController, SuperAdminCompaniesController],
  providers: [SuperAdminAuthService, SuperAdminGuard],
  exports: [SuperAdminGuard, AdminsModule],
})
export class SuperAdminModule {}
