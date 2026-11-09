import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { CategoriesModule } from '../categories/categories.module';
import { ProductsModule } from '../products/products.module';
import { UsersModule } from '../users/users.module';
import { PurchasesResolver } from './purchases.resolver';
import { PurchasesService } from './purchases.service';

@Module({
  imports: [AnalyticsModule, CategoriesModule, ProductsModule, UsersModule],
  providers: [PurchasesService, PurchasesResolver],
  exports: [PurchasesService],
})
export class PurchasesModule {}
