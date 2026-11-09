import { Module } from '@nestjs/common';
import { AnalyticsResolver } from './analytics.resolver';
import { AnalyticsService } from './analytics.service';
import { InventoryService } from './inventory.service';

@Module({
  providers: [InventoryService, AnalyticsService, AnalyticsResolver],
  exports: [InventoryService],
})
export class AnalyticsModule {}
