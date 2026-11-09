import { Field, Int, ObjectType } from '@nestjs/graphql';
import { UserModel } from '../../users/models/user.model';

@ObjectType('AuthPayload')
export class AuthPayloadModel {
  @Field({ description: 'Short-lived JWT, send it as "Authorization: Bearer <token>"' })
  accessToken: string;

  @Field(() => Int, { description: 'Access token lifetime in seconds' })
  expiresIn: number;

  @Field(() => UserModel)
  user: UserModel;
}
