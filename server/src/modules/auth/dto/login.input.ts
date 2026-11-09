import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

@InputType()
export class LoginInput {
  @Field()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'EMAIL_INVALID' })
  @MaxLength(254)
  email: string;

  @Field()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  password: string;
}
