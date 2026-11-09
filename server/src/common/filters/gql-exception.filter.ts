import { ArgumentsHost, BadRequestException, Catch, ConflictException, HttpException, Logger, NotFoundException } from '@nestjs/common';
import { GqlExceptionFilter } from '@nestjs/graphql';
import { Prisma } from '../../generated/prisma/client';
import { PricingError } from '../money/pricing';

/**
 * Converts low-level errors into clear GraphQL errors and makes sure internal
 * details (SQL, stack traces) never leak to the client.
 */
@Catch()
export class AppExceptionFilter implements GqlExceptionFilter {
  private readonly logger = new Logger('AppExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    if (exception instanceof HttpException) {
      if (host.getType() === 'http') return this.reply(host, exception);
      return exception;
    }
    let mapped: HttpException;
    if (exception instanceof PricingError) {
      mapped = new BadRequestException({ message: exception.code, code: exception.code });
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError && exception.code === 'P2002') {
      mapped = new ConflictException({ message: 'UNIQUE_CONSTRAINT', fields: exception.meta?.target ?? null });
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError && exception.code === 'P2025') {
      mapped = new NotFoundException('NOT_FOUND');
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError && exception.code === 'P2003') {
      mapped = new ConflictException('RELATED_RECORDS_EXIST');
    } else {
      this.logger.error(exception instanceof Error ? exception.stack ?? exception.message : String(exception));
      mapped = new HttpException('INTERNAL_ERROR', 500);
    }
    if (host.getType() === 'http') return this.reply(host, mapped);
    return mapped;
  }

  private reply(host: ArgumentsHost, error: HttpException) {
    const res = host.switchToHttp().getResponse();
    res.status(error.getStatus()).json(error.getResponse());
  }
}
