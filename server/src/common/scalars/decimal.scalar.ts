import { CustomScalar, Scalar } from '@nestjs/graphql';
import { Kind, ValueNode } from 'graphql';
import { Decimal, parseDecimal } from '../money/money';

/** Exact decimal numbers. Serialized as strings so that no precision is lost on the wire. */
@Scalar('Decimal', () => Decimal)
export class DecimalScalar implements CustomScalar<string, string> {
  description = 'Exact decimal number serialized as a string, e.g. "12840.50"';

  /**
   * Inputs are validated and normalized to a plain decimal string (e.g. "12840.5");
   * services convert them with dec(). Keeping strings avoids class-transformer
   * re-instantiating Decimal objects in the ValidationPipe.
   */
  parseValue(value: unknown): string {
    const parsed = parseDecimal(value);
    if (!parsed) throw new TypeError('Decimal: invalid value');
    return parsed.toString();
  }

  serialize(value: unknown): string {
    const parsed = parseDecimal(value as Decimal | string | number);
    if (!parsed) throw new TypeError('Decimal: cannot serialize value');
    return parsed.toString();
  }

  parseLiteral(ast: ValueNode): string {
    if (ast.kind === Kind.STRING || ast.kind === Kind.INT || ast.kind === Kind.FLOAT) return this.parseValue(ast.value);
    throw new TypeError('Decimal: expected a string or a number literal');
  }
}
