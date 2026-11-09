import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types';
import { UpdateExchangeRatesInput } from './dto/update-rates.input';
import { ExchangeRatesModel } from './models/exchange-rates.model';
import { SettingsService } from './settings.service';

@Resolver()
export class SettingsResolver {
  constructor(private readonly settings: SettingsService) {}

  @Query(() => ExchangeRatesModel)
  exchangeRates() {
    return this.settings.getRates();
  }

  @Mutation(() => ExchangeRatesModel)
  updateExchangeRates(@Args('input') input: UpdateExchangeRatesInput, @CurrentUser() user: AuthUser) {
    return this.settings.updateRates(input, user.id);
  }

  @Mutation(() => ExchangeRatesModel)
  resetExchangeRates(@CurrentUser() user: AuthUser) {
    return this.settings.resetRates(user.id);
  }
}
