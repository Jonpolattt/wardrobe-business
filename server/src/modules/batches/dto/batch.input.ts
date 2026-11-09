import { Field, InputType, Int } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import { BatchStatus, Currency } from '../../../common/enums';
import { Decimal } from '../../../common/money/money';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

@InputType()
export class BatchInput {
  @Field()
  @Transform(trim)
  @IsString()
  @MinLength(1, { message: 'NAME_REQUIRED' })
  @MaxLength(160)
  name: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Transform(trim)
  @MaxLength(160)
  nameUz?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Transform(trim)
  @MaxLength(160)
  origin?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Transform(trim)
  @MaxLength(160)
  originUz?: string | null;

  @Field(() => BatchStatus, { nullable: true })
  @IsOptional()
  @IsEnum(BatchStatus)
  status?: BatchStatus | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Matches(DATE, { message: 'DATE_INVALID' })
  orderDate?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Matches(DATE, { message: 'DATE_INVALID' })
  arrivalDate?: string | null;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10_000_000)
  plannedUnits?: number | null;

  @Field(() => Decimal, { nullable: true })
  @IsOptional()
  plannedCost?: string | null;

  @Field(() => Currency, { nullable: true })
  @IsOptional()
  @IsEnum(Currency)
  plannedCurrency?: Currency | null;
}
