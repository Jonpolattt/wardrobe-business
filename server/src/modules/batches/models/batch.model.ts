import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { BatchStatus, Currency } from '../../../common/enums';
import { Decimal } from '../../../common/money/money';

@ObjectType('Batch', { description: 'Shipment. All *Uzs totals are calculated by the backend from its purchase lots.' })
export class BatchModel {
  @Field(() => ID)
  id: string;

  @Field()
  code: string;

  @Field()
  nameRu: string;

  @Field()
  nameUz: string;

  @Field()
  originRu: string;

  @Field()
  originUz: string;

  @Field(() => BatchStatus)
  status: BatchStatus;

  @Field(() => String, { nullable: true })
  orderDate: string | null;

  @Field(() => String, { nullable: true })
  arrivalDate: string | null;

  @Field({ description: 'Display date: arrival, otherwise order, otherwise creation date (YYYY-MM-DD)' })
  date: string;

  @Field(() => Int, { nullable: true })
  plannedUnits: number | null;

  @Field(() => Decimal, { nullable: true })
  plannedCost: Decimal | null;

  @Field(() => Currency, { nullable: true })
  plannedCurrency: Currency | null;

  @Field(() => Int, { description: 'Number of active purchase lots' })
  lotsCount: number;

  @Field(() => Int, { description: 'Units in the batch (planned units while there are no lots)' })
  quantity: number;

  @Field(() => Decimal)
  totalCostUzs: Decimal;

  @Field(() => Decimal)
  expectedRevenueUzs: Decimal;

  @Field(() => Decimal)
  expectedProfitUzs: Decimal;

  @Field(() => Decimal, { description: 'expected profit / total cost × 100' })
  expectedProfitPercent: Decimal;

  @Field(() => Int)
  soldQty: number;

  @Field(() => Decimal)
  revenueUzs: Decimal;

  @Field(() => Decimal)
  cogsUzs: Decimal;

  @Field(() => Decimal, { nullable: true, description: 'null when none of the products is linked to the store' })
  actualProfitUzs: Decimal | null;

  @Field(() => Decimal, { description: 'Net result of the batch: revenue − total cost (UZS)' })
  netProfitUzs: Decimal;

  @Field(() => Decimal, { description: 'netProfitUzs / totalCostUzs × 100' })
  netProfitPercent: Decimal;

  @Field()
  archived: boolean;

  @Field()
  createdAt: Date;
}
