import { Field, ObjectType } from '@nestjs/graphql';
import { Decimal } from '../../../common/money/money';

@ObjectType('ExchangeRates', { description: 'Shared exchange rates: how many units of a currency equal 1 USD' })
export class ExchangeRatesModel {
  @Field(() => Decimal)
  usdToUzs: Decimal;

  @Field(() => Decimal)
  usdToCny: Decimal;

  @Field()
  updatedAt: Date;
}
