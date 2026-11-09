import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, IsString } from 'class-validator';
import { Decimal } from '../../../common/money/money';

@InputType()
export class UpdateExchangeRatesInput {
  @Field(() => Decimal, { nullable: true })
  @IsOptional()
  @IsString()
  usdToUzs?: string;

  @Field(() => Decimal, { nullable: true })
  @IsOptional()
  @IsString()
  usdToCny?: string;
}
