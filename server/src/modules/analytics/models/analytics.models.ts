import { Field, Float, ID, InputType, Int, ObjectType } from '@nestjs/graphql';
import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ChartRange } from '../../../common/enums';
import { Decimal } from '../../../common/money/money';

@InputType()
export class DashboardFilterInput {
  @Field(() => Int, { defaultValue: 30 })
  @IsInt()
  @Min(1)
  @Max(366)
  periodDays: number;

  @Field(() => [ID], { nullable: true, description: 'Selected purchase lots; when set the totals are calculated for the selection (all time)' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1000)
  @IsString({ each: true })
  purchaseIds?: string[];

  @Field(() => [ID], { nullable: true, description: 'Selected batches (all their lots are included)' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1000)
  @IsString({ each: true })
  batchIds?: string[];
}

@ObjectType('DashboardTotals')
export class DashboardTotalsModel {
  @Field(() => Decimal, { description: 'Revenue from counted store sales (UZS)' })
  revenue: Decimal;

  @Field(() => Int, { description: 'Units sold' })
  salesCount: number;

  @Field(() => Decimal, { description: 'Purchase spending incl. cargo (UZS)' })
  expenses: Decimal;

  @Field(() => Decimal, { description: 'Actual profit = revenue − FIFO cost of the units with a known cost (UZS)' })
  profit: Decimal;

  @Field(() => Decimal, { description: 'Expected profit of the lots in scope (UZS)' })
  expectedProfit: Decimal;

  @Field(() => Int, { description: 'Sold units whose purchase cost is unknown (not linked or oversold) — excluded from profit' })
  unallocatedUnits: number;
}

@ObjectType('DashboardStats')
export class DashboardStatsModel {
  @Field(() => DashboardTotalsModel)
  current: DashboardTotalsModel;

  @Field(() => DashboardTotalsModel, { nullable: true, description: 'Previous period of the same length; null for a selection' })
  previous: DashboardTotalsModel | null;

  @Field({ description: 'True when the stats are calculated for selected lots/batches' })
  selection: boolean;

  @Field(() => Date, { nullable: true })
  from: Date | null;

  @Field()
  to: Date;

  @Field(() => Decimal, { nullable: true, description: 'Change vs the previous period, percent (null for a selection or an empty previous period)' })
  revenueChangePercent: Decimal | null;

  @Field(() => Decimal, { nullable: true })
  salesChangePercent: Decimal | null;

  @Field(() => Decimal, { nullable: true })
  expensesChangePercent: Decimal | null;

  @Field(() => Decimal, { nullable: true })
  profitChangePercent: Decimal | null;

  @Field(() => [Float], { description: 'Chart helpers (10 points, display only)' })
  revenueSpark: number[];

  @Field(() => [Float])
  salesSpark: number[];

  @Field(() => [Float])
  expensesSpark: number[];

  @Field(() => [Float])
  profitSpark: number[];
}

@ObjectType('SeriesPoint')
export class SeriesPointModel {
  @Field({ description: 'Bucket start, YYYY-MM-DD' })
  date: string;

  @Field(() => Decimal)
  revenue: Decimal;

  @Field(() => Decimal)
  expenses: Decimal;
}

@ObjectType('RevenueSeries')
export class RevenueSeriesModel {
  @Field(() => ChartRange)
  range: ChartRange;

  @Field(() => [SeriesPointModel])
  points: SeriesPointModel[];

  @Field(() => Decimal)
  totalRevenue: Decimal;

  @Field(() => Decimal)
  totalExpenses: Decimal;

  @Field(() => Decimal, { nullable: true, description: 'Revenue change vs the previous range, percent' })
  revenueChangePercent: Decimal | null;

  @Field(() => Decimal, { nullable: true })
  expensesChangePercent: Decimal | null;
}

@ObjectType('CategorySales')
export class CategorySalesModel {
  @Field()
  key: string;

  @Field()
  nameRu: string;

  @Field()
  nameUz: string;

  @Field(() => Int)
  units: number;

  @Field(() => Decimal)
  revenue: Decimal;

  @Field(() => Decimal)
  sharePercent: Decimal;
}

@ObjectType('CategoryBreakdown')
export class CategoryBreakdownModel {
  @Field(() => Int)
  totalUnits: number;

  @Field(() => [CategorySalesModel])
  categories: CategorySalesModel[];
}

@ObjectType('ExpenseRow')
export class ExpenseRowModel {
  @Field(() => ID)
  id: string;

  @Field({ description: 'Inventory (purchase) or Logistics (cargo)' })
  kind: string;

  @Field()
  titleRu: string;

  @Field()
  titleUz: string;

  @Field()
  date: string;

  @Field(() => Decimal)
  amountUzs: Decimal;

  @Field(() => ID)
  purchaseId: string;
}

@ObjectType('ActivityItem')
export class ActivityItemModel {
  @Field(() => ID)
  id: string;

  @Field()
  type: string;

  @Field()
  title: string;

  @Field(() => String, { nullable: true })
  actorName: string | null;

  @Field(() => Int, { nullable: true, description: 'Units (purchases) or new/updated sales (store sync)' })
  quantity: number | null;

  @Field()
  createdAt: Date;
}
