import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";
import { ScheduleModule } from "@nestjs/schedule";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { AnalyticsModule } from "./analytics/analytics.module";
import { AuditModule } from "./audit/audit.module";
import { AuthModule } from "./auth/auth.module";
import { JwtAuthGuard } from "./common/guards/jwt-auth.guard";
import { RolesGuard } from "./common/guards/roles.guard";
import { validateEnvironment } from "./config/environment";
import { CategoriesModule } from "./categories/categories.module";
import { HealthModule } from "./health/health.module";
import { MailModule } from "./mail/mail.module";
import { PrismaModule } from "./prisma.module";
import { RecommendationsModule } from "./recommendations/recommendations.module";
import { ResourcesModule } from "./resources/resources.module";
import { StorageModule } from "./storage/storage.module";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      { name: "default", ttl: 60_000, limit: 120 },
      { name: "auth", ttl: 60_000, limit: 10 },
    ]),
    PrismaModule,
    MailModule,
    StorageModule,
    AuditModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ResourcesModule,
    RecommendationsModule,
    AnalyticsModule,
    HealthModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
