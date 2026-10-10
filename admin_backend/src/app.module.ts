import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import awsConfig from './config/aws.config';
import corsConfig from './config/cors.config';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import redisConfig from './config/redis.config';
import superAdminConfig from './config/super-admin.config';
import adminConfig from './config/admin.config';
import { CompanyContextModule } from './common/auth/company-context.module';
import { LoginLockoutModule } from './common/auth/login-lockout.module';
import authConfig from './config/auth.config';
import { LoginThrottlerGuard } from './common/guards/login-throttler.guard';
import { RejectUrlencodedMiddleware } from './common/middleware/reject-urlencoded.middleware';
import { EmailModule } from './common/email/email.module';
import { StorageModule } from './common/storage/storage.module';
import { HealthModule } from './health/health.module';
import { AdminsModule } from './modules/admins/admins.module';
import { AuthModule } from './modules/auth/auth.module';
import { CandidateCentreMappingsModule } from './modules/candidate-centre-mappings/candidate-centre-mappings.module';
import { CandidatesModule } from './modules/candidates/candidates.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CategorySubjectTopicMappingsModule } from './modules/category-subject-topic-mappings/category-subject-topic-mappings.module';
import { CentresModule } from './modules/centres/centres.module';
import { CentreUsersModule } from './modules/centre-users/centre-users.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { DifficultiesModule } from './modules/difficulties/difficulties.module';
import { EventsModule } from './modules/events/events.module';
import { FeedbacksModule } from './modules/feedbacks/feedbacks.module';
import { FilesModule } from './modules/files/files.module';
import { GroupsModule } from './modules/groups/groups.module';
import { InstructionsModule } from './modules/instructions/instructions.module';
import { LabsModule } from './modules/labs/labs.module';
import { LanguagesModule } from './modules/languages/languages.module';
import { QuestionsModule } from './modules/questions/questions.module';
import { RegionsModule } from './modules/regions/regions.module';
import { SessionsModule } from './modules/sessions/sessions.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { SuperAdminModule } from './modules/super-admin/super-admin.module';
import { TemplatesModule } from './modules/templates/templates.module';
import { TestsModule } from './modules/tests/tests.module';
import { TestCandidateMappingsModule } from './modules/test-candidate-mappings/test-candidate-mappings.module';
import { TestSettingsModule } from './modules/test-settings/test-settings.module';
import { TopicsModule } from './modules/topics/topics.module';
import { ZonesModule } from './modules/zones/zones.module';
import { RedisModule } from './redis/redis.module';
import { SuperAdminSeedModule } from './seeders/super-admin/super-admin-seed.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [
        databaseConfig,
        jwtConfig,
        corsConfig,
        redisConfig,
        awsConfig,
        superAdminConfig,
        adminConfig,
        authConfig,
      ],
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: config.getOrThrow<number>('auth.loginThrottle.ttlMs'),
            limit: config.getOrThrow<number>('auth.loginThrottle.limit'),
          },
        ],
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get<string>('database.host'),
        port: Number(config.get('database.port')),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.database'),
        autoLoadEntities: true,
        synchronize: config.get<boolean>('database.synchronize'),
        ssl: config.get<boolean>('database.ssl')
          ? { rejectUnauthorized: false }
          : false,
        timezone: 'Z',
        extra: {
          options: '-c timezone=UTC',
        },
      }),
    }),
    RedisModule,
    LoginLockoutModule,
    CompanyContextModule,
    StorageModule,
    EmailModule,
    AuthModule,
    SuperAdminModule,
    SuperAdminSeedModule,
    TemplatesModule,
    AdminsModule,
    CandidatesModule,
    CandidateCentreMappingsModule,
    CentresModule,
    CentreUsersModule,
    CompaniesModule,
    DifficultiesModule,
    CategoriesModule,
    CategorySubjectTopicMappingsModule,
    EventsModule,
    FeedbacksModule,
    GroupsModule,
    InstructionsModule,
    LabsModule,
    LanguagesModule,
    QuestionsModule,
    RegionsModule,
    SessionsModule,
    SubjectsModule,
    TopicsModule,
    TestsModule,
    TestCandidateMappingsModule,
    TestSettingsModule,
    ZonesModule,
    FilesModule,
    HealthModule,
  ],
  controllers: [AppController],
  providers: [AppService, LoginThrottlerGuard],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RejectUrlencodedMiddleware).forRoutes('*');
  }
}
