import { Field, InputType } from '@nestjs/graphql';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const trim = ({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value);

@InputType()
export class UpdateProfileInput {
  @Field()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  firstName: string;

  @Field()
  @Transform(trim)
  @IsString()
  @MaxLength(80)
  lastName: string;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @Transform(trim)
  @Matches(/^[+\d\s()-]{0,24}$/, { message: 'PHONE_INVALID' })
  phone?: string | null;

  @Field(() => String, { nullable: true, description: 'URL returned by POST /uploads, or null to remove the photo' })
  @IsOptional()
  @Matches(/^\/uploads\/[\w./-]+$/, { message: 'PHOTO_URL_INVALID' })
  photoUrl?: string | null;
}

@InputType()
export class ChangeEmailInput {
  @Field()
  @IsString()
  @MinLength(1)
  currentPassword: string;

  @Field()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail({}, { message: 'EMAIL_INVALID' })
  @MaxLength(254)
  newEmail: string;
}

@InputType()
export class ChangePasswordInput {
  @Field()
  @IsString()
  @MinLength(1)
  currentPassword: string;

  @Field()
  @IsString()
  @MinLength(8, { message: 'PASSWORD_TOO_SHORT' })
  @MaxLength(128)
  newPassword: string;
}
