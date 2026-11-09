import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { BatchStatus, Currency, PricingMode } from '../../../common/enums';
import { Decimal } from '../../../common/money/money';
import { ProductModel } from '../../products/models/product.model';

@ObjectType('BatchRef')
export class BatchRefModel {
  @Field(() => ID)
  id: string;

  @Field()
  code: string;

  @Field()
  nameRu: string;

  @Field()
  nameUz: string;

  @Field(() => BatchStatus)
  status: BatchStatus;
}

/**
 * A purchase lot. Amounts without a suffix are in `currency`; the *Uzs fields
 * are converted with the rate snapshot taken when the lot was entered.
 */
@ObjectType('Purchase')
export class PurchaseModel {
  @Field(() => ID)
  id: string;

  @Field(() => ProductModel)
  product: ProductModel;

  @Field(() => BatchRefModel, { nullable: true })
  batch: BatchRefModel | null;

  @Field(() => Currency)
  currency: Currency;

  @Field(() => Decimal)
  fxRateToUzs: Decimal;

  @Field(() => Decimal)
  unitCost: Decimal;

  @Field(() => Int)
  quantity: number;

  @Field(() => Decimal)
  cargoTotal: Decimal;

  @Field(() => PricingMode)
  pricingMode: PricingMode;

  @Field(() => Decimal)
  markupPercent: Decimal;

  @Field(() => Decimal)
  salePrice: Decimal;

  @Field(() => Decimal)
  purchaseTotal: Decimal;

  @Field(() => Decimal)
  cargoPerUnit: Decimal;

  @Field(() => Decimal)
  unitCostWithCargo: Decimal;

  @Field(() => Decimal)
  totalCost: Decimal;

  @Field(() => Decimal)
  expectedRevenue: Decimal;

  @Field(() => Decimal)
  expectedProfit: Decimal;

  @Field(() => Decimal)
  unitCostUzs: Decimal;

  @Field(() => Decimal)
  unitCostWithCargoUzs: Decimal;

  @Field(() => Decimal)
  cargoTotalUzs: Decimal;

  @Field(() => Decimal)
  salePriceUzs: Decimal;

  @Field(() => Decimal)
  totalCostUzs: Decimal;

  @Field(() => Decimal)
  expectedProfitUzs: Decimal;

  @Field(() => Decimal, { description: 'salePrice × quantity in UZS' })
  expectedRevenueUzs: Decimal;

  @Field(() => Decimal, { description: 'Cargo per unit in UZS' })
  cargoPerUnitUzs: Decimal;

  @Field(() => Decimal, { description: 'salePrice − unitCostWithCargo per unit, UZS' })
  unitProfitUzs: Decimal;

  @Field(() => Decimal, { description: 'Expected profit of the units still in stock (remainingQty × unit profit), UZS' })
  remainingProfitUzs: Decimal;

  @Field(() => Int, { description: 'Units sold from this lot (FIFO over synced store sales)' })
  soldQty: number;

  @Field(() => Int)
  remainingQty: number;

  @Field(() => Decimal, { description: 'Revenue of the units sold from this lot (UZS)' })
  revenueUzs: Decimal;

  @Field(() => Decimal, { description: 'Cost of goods sold for this lot (UZS)' })
  cogsUzs: Decimal;

  @Field(() => Decimal, { nullable: true, description: 'Actual profit; null when the product is not linked to the store' })
  actualProfitUzs: Decimal | null;

  @Field({ description: 'True when sales data comes from the linked store product' })
  hasSalesData: boolean;

  @Field(() => String, { nullable: true })
  orderDate: string | null;

  @Field(() => String, { nullable: true })
  arrivalDate: string | null;

  @Field()
  archived: boolean;

  @Field()
  createdAt: Date;

  @Field()
  updatedAt: Date;
}

@ObjectType('DeleteResult')
export class DeleteResultModel {
  @Field(() => ID)
  id: string;

  @Field({ description: 'true — the record has financial history and was archived instead of deleted' })
  archived: boolean;
}
