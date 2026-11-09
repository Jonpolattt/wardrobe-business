import { Field, ID, InputType, Int } from '@nestjs/graphql';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsEnum, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { Currency, GarmentKind, PricingMode } from '../../../common/enums';
import { Decimal } from '../../../common/money/money';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

@InputType()
export class PurchaseProductInput {
  @Field(() => ID, { nullable: true, description: 'Existing product (repeat purchase). Omit to create a new product.' })
  @IsOptional()
  @IsString()
  productId?: string | null;

  @Field()
  @Transform(trim)
  @IsString()
  @MinLength(1, { message: 'NAME_REQUIRED' })
  @MaxLength(160)
  name: string;

  @Field(() => String, { nullable: true, description: 'Uzbek name; defaults to `name`' })
  @IsOptional()
  @Transform(trim)
  @MaxLength(160)
  nameUz?: string | null;

  @Field()
  @IsString()
  categoryKey: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Transform(trim)
  @MaxLength(80)
  sku?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'COLOR_INVALID' })
  color?: string | null;

  @Field(() => GarmentKind, { nullable: true })
  @IsOptional()
  @IsEnum(GarmentKind)
  kind?: GarmentKind | null;

  @Field(() => [String], { nullable: true, description: 'Up to 6 photo URLs returned by POST /uploads; the first one is the cover' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @Matches(/^\/uploads\/[\w./-]+$/, { each: true, message: 'PHOTO_URL_INVALID' })
  photos?: string[] | null;
}

@InputType()
export class PurchaseInput {
  @Field(() => PurchaseProductInput)
  @ValidateNested()
  @Type(() => PurchaseProductInput)
  product: PurchaseProductInput;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  @IsString()
  batchId?: string | null;

  @Field(() => Currency)
  @IsEnum(Currency)
  currency: Currency;

  @Field(() => Decimal, { description: 'Purchase price of one unit' })
  @IsString()
  unitCost: string;

  @Field(() => Int)
  @IsInt({ message: 'QUANTITY_INVALID' })
  @Min(1, { message: 'QUANTITY_INVALID' })
  @Max(10_000_000)
  quantity: number;

  @Field(() => Decimal, { nullable: true, description: 'Cargo cost for the whole lot' })
  @IsOptional()
  cargoTotal?: string | null;

  @Field(() => PricingMode)
  @IsEnum(PricingMode)
  pricingMode: PricingMode;

  @Field(() => Decimal, { nullable: true })
  @IsOptional()
  markupPercent?: string | null;

  @Field(() => Decimal, { nullable: true })
  @IsOptional()
  salePrice?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Matches(DATE, { message: 'DATE_INVALID' })
  orderDate?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Matches(DATE, { message: 'DATE_INVALID' })
  arrivalDate?: string | null;
}

@InputType()
export class PurchaseFilterInput {
  @Field(() => String, { nullable: true })
  @IsOptional()
  @Transform(trim)
  @MaxLength(120)
  search?: string | null;

  @Field(() => String, { nullable: true })
  @IsOptional()
  categoryKey?: string | null;

  @Field(() => ID, { nullable: true })
  @IsOptional()
  batchId?: string | null;

  @Field({ nullable: true, defaultValue: false })
  @IsOptional()
  includeArchived?: boolean;
}
