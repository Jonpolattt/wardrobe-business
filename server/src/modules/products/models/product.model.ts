import { Field, ID, Int, ObjectType } from '@nestjs/graphql';
import { GarmentKind } from '../../../common/enums';
import { CategoryModel } from '../../categories/models/category.model';

@ObjectType('StoreLink', { description: 'The linked product of the online store (read-only, filled by the sync)' })
export class StoreLinkModel {
  @Field(() => ID)
  externalId: string;

  @Field()
  sku: string;

  @Field()
  title: string;

  @Field(() => Int, { description: 'Current stock in the store — the source of truth for stock' })
  stock: number;

  @Field(() => Int)
  soldCount: number;

  @Field()
  isActive: boolean;

  @Field()
  syncedAt: Date;
}

@ObjectType('Product')
export class ProductModel {
  @Field(() => ID)
  id: string;

  @Field()
  code: string;

  @Field()
  nameRu: string;

  @Field()
  nameUz: string;

  @Field(() => String, { nullable: true })
  sku: string | null;

  @Field(() => CategoryModel)
  category: CategoryModel;

  @Field()
  color: string;

  @Field(() => GarmentKind)
  kind: GarmentKind;

  @Field(() => [String])
  photos: string[];

  @Field(() => StoreLinkModel, { nullable: true })
  storeProduct: StoreLinkModel | null;

  @Field(() => Date, { nullable: true })
  archivedAt: Date | null;

  @Field()
  createdAt: Date;
}
