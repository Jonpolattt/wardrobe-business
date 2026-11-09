import { Args, Int, Query, Resolver } from '@nestjs/graphql';
import { ChartRange } from '../../common/enums';
import { AnalyticsService } from './analytics.service';
import {
  ActivityItemModel,
  CategoryBreakdownModel,
  DashboardFilterInput,
  DashboardStatsModel,
  ExpenseRowModel,
  RevenueSeriesModel,
} from './models/analytics.models';

@Resolver()
export class AnalyticsResolver {
  constructor(private readonly analytics: AnalyticsService) {}

  @Query(() => DashboardStatsModel)
  dashboard(@Args('filter') filter: DashboardFilterInput) {
    return this.analytics.dashboard(filter);
  }

  @Query(() => RevenueSeriesModel)
  revenueSeries(@Args('range', { type: () => ChartRange }) range: ChartRange) {
    return this.analytics.revenueSeries(range);
  }

  @Query(() => CategoryBreakdownModel)
  salesByCategory(@Args('periodDays', { type: () => Int, defaultValue: 30 }) periodDays: number) {
    return this.analytics.salesByCategory(Math.min(Math.max(periodDays, 1), 366));
  }

  @Query(() => [ExpenseRowModel])
  expenses(@Args('periodDays', { type: () => Int, nullable: true }) periodDays?: number) {
    return this.analytics.expenses(periodDays ? Math.min(Math.max(periodDays, 1), 3660) : null);
  }

  @Query(() => [ActivityItemModel])
  activity(@Args('limit', { type: () => Int, defaultValue: 8 }) limit: number) {
    return this.analytics.activity(limit);
  }
}
