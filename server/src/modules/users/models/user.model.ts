import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('User')
export class UserModel {
  @Field(() => ID)
  id: string;

  @Field()
  email: string;

  @Field()
  firstName: string;

  @Field()
  lastName: string;

  @Field(() => String, { nullable: true })
  phone: string | null;

  @Field(() => String, { nullable: true })
  photoUrl: string | null;

  @Field(() => Date, { nullable: true })
  lastLoginAt: Date | null;

  @Field()
  createdAt: Date;
}
