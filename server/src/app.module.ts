import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { GraphQLModule } from '@nestjs/graphql';
import { ThrottlerModule } from '@nestjs/throttler';
import { join } from 'path';
import './common/enums';
import { AppExceptionFilter } from './common/filters/gql-exception.filter';
import { GqlAuthGuard } from './common/guards/gql-auth.guard';
import { GqlThrottlerGuard } from './common/guards/gql-throttler.guard';
import { DecimalScalar } from './common/scalars/decimal.scalar';
import configuration from './config/configuration';
import { ActivityModule } from './modules/activity/activity.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuthModule } from './modules/auth/auth.module';
import { BatchesModule } from './modules/batches/batches.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { IntegrationsModule } from './modules/integrations/integrations.module';
import { ProductsModule } from './modules/products/products.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { SettingsModule } from './modules/settings/settings.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { UsersModule } from './modules/users/users.module';
import { PrismaModule } from './prisma/prisma.module';

const isProduction = process.env.NODE_ENV === 'production';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration], cache: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 300 }]),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: isProduction ? true : join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      introspection: !isProduction,
      playground: false,
      plugins: isProduction ? [] : [ApolloServerPluginLandingPageLocalDefault()],
      context: ({ req, res }: { req: unknown; res: unknown }) => ({ req, res }),
      formatError: (formatted) => {
        const { extensions, ...rest } = formatted;
        const { stacktrace: _omit, ...safeExtensions } = (extensions ?? {}) as Record<string, unknown>;
        // Validation errors carry their codes in originalError.message — expose the first one as the message.
        const original = safeExtensions.originalError as { message?: unknown } | undefined;
        const first = Array.isArray(original?.message) ? original.message[0] : undefined;
        return { ...rest, message: typeof first === 'string' ? first : rest.message, extensions: safeExtensions };
      },
    }),
    PrismaModule,
    ActivityModule,
    SettingsModule,
    AuthModule,
    UsersModule,
    CategoriesModule,
    ProductsModule,
    AnalyticsModule,
    PurchasesModule,
    BatchesModule,
    IntegrationsModule,
    UploadsModule,
  ],
  providers: [
    DecimalScalar,
    { provide: APP_GUARD, useClass: GqlThrottlerGuard },
    { provide: APP_GUARD, useClass: GqlAuthGuard },
    { provide: APP_FILTER, useClass: AppExceptionFilter },
  ],
})
export class AppModule {}
