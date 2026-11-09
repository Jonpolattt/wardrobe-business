import { Field, ID, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('Category')
export class CategoryModel {
  @Field(() => ID)
  id: string;

  @Field({ description: 'Stable key used by the interface, e.g. "T-shirts"' })
  key: string;

  @Field()
  nameRu: string;

  @Field()
  nameUz: string;

  @Field(() => Int)
  sortOrder: number;
}
