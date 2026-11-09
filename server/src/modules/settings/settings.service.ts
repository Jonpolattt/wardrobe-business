import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Decimal, dec } from '../../common/money/money';
import { ActivityService } from '../activity/activity.service';
import type { Currency, Prisma } from '../../generated/prisma/client';
import type { UpdateExchangeRatesInput } from './dto/update-rates.input';

export const DEFAULT_RATES = { usdToUzs: new Decimal('12840'), usdToCny: new Decimal('7.1') };

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
  ) {}

  async getRates(tx: Prisma.TransactionClient = this.prisma) {
    const existing = await tx.appSettings.findUnique({ where: { id: 1 } });
    if (existing) return existing;
    return tx.appSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1, ...DEFAULT_RATES } });
  }

  async updateRates(input: UpdateExchangeRatesInput, userId: string) {
    const check = (raw: string | undefined) => {
      if (raw === undefined || raw === null) return undefined;
      const v = dec(raw);
      if (v.lte(0) || v.gt(1_000_000)) throw new BadRequestException('RATE_INVALID');
      return v.toDecimalPlaces(6, Decimal.ROUND_HALF_UP);
    };
    await this.getRates();
    const updated = await this.prisma.appSettings.update({
      where: { id: 1 },
      data: { usdToUzs: check(input.usdToUzs), usdToCny: check(input.usdToCny), updatedById: userId },
    });
    await this.activity.log('RATES_UPDATED', `1 USD = ${updated.usdToUzs.toString()} UZS · ${updated.usdToCny.toString()} CNY`, userId);
    return updated;
  }

  async resetRates(userId: string) {
    return this.updateRates({ usdToUzs: DEFAULT_RATES.usdToUzs.toString(), usdToCny: DEFAULT_RATES.usdToCny.toString() }, userId);
  }

  /** UZS for 1 unit of `currency` according to the current rates. */
  async fxToUzs(currency: Currency, tx: Prisma.TransactionClient = this.prisma): Promise<Decimal> {
    const rates = await this.getRates(tx);
    if (currency === 'UZS') return new Decimal(1);
    if (currency === 'USD') return dec(rates.usdToUzs);
    return dec(rates.usdToUzs).div(dec(rates.usdToCny)).toDecimalPlaces(6, Decimal.ROUND_HALF_UP);
  }
}
