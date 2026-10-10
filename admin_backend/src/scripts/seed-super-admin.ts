import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SuperAdminSeederService } from '../seeders/super-admin/super-admin-seeder.service';

async function bootstrap() {
  const logger = new Logger('SeedSuperAdmin');
  const app = await NestFactory.createApplicationContext(AppModule);
  const seeder = app.get(SuperAdminSeederService);

  try {
    await seeder.seed();
    logger.log('Super-Admin seeded successfully');
  } finally {
    await app.close();
  }
}

bootstrap();
