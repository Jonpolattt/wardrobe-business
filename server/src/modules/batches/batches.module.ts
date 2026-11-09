import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { PurchasesModule } from '../purchases/purchases.module';
import { UsersModule } from '../users/users.module';
import { BatchesResolver } from './batches.resolver';
import { BatchesService } from './batches.service';

@Module({
  imports: [AnalyticsModule, PurchasesModule, UsersModule],
  providers: [BatchesService, BatchesResolver],
})
export class BatchesModule {}
