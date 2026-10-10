import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CentresModule } from '../centres/centres.module';
import { CompaniesModule } from '../companies/companies.module';
import { CentreUsersAuthService } from './centre-users-auth.service';
import { CentreUsersController } from './centre-users.controller';
import { CentreUsersService } from './centre-users.service';
import { CentreUser } from './entities/centre-user.entity';
import { CentreUserJwtAuthGuard } from './guards/centre-user-jwt-auth.guard';

@Module({
  imports: [
    TypeOrmModule.forFeature([CentreUser]),
    CentresModule,
    CompaniesModule,
  ],
  controllers: [CentreUsersController],
  providers: [
    CentreUsersService,
    CentreUsersAuthService,
    {
      provide: APP_GUARD,
      useClass: CentreUserJwtAuthGuard,
    },
  ],
  exports: [CentreUsersService],
})
export class CentreUsersModule {}
