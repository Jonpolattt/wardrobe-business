import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { GqlExecutionContext } from '@nestjs/graphql';
import type { AuthUser } from '../types';

export const CurrentUser = createParamDecorator((_data: unknown, context: ExecutionContext): AuthUser => {
  if (context.getType() === 'http') return context.switchToHttp().getRequest().user;
  return GqlExecutionContext.create(context).getContext().req.user;
});
