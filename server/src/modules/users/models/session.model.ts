import { Field, ID, ObjectType } from '@nestjs/graphql';

@ObjectType('UserSession')
export class SessionModel {
  @Field(() => ID)
  id: string;

  @Field(() => String, { nullable: true })
  userAgent: string | null;

  @Field(() => String, { nullable: true })
  ip: string | null;

  @Field()
  createdAt: Date;

  @Field()
  lastUsedAt: Date;

  @Field({ description: 'The session of the current browser' })
  current: boolean;
}
