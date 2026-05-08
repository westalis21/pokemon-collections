import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PokemonCache,
  PokemonCacheSchema,
} from './schemas/pokemon-cache.schema';
import { PokeApiClient } from './poke-api.client';
import { PokemonCacheService } from './pokemon-cache.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PokemonCache.name, schema: PokemonCacheSchema },
    ]),
  ],
  providers: [PokeApiClient, PokemonCacheService],
  exports: [PokemonCacheService],
})
export class PokemonModule implements OnModuleInit {
  private readonly logger = new Logger(PokemonModule.name);

  constructor(
    private readonly cache: PokemonCacheService,
    private readonly config: ConfigService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (this.config.get<string>('WARMUP_DISABLED') === '1') {
      return;
    }
    try {
      await this.cache.warmup(2000);
    } catch (err) {
      this.logger.warn(`Pokemon cache warmup failed: ${(err as Error).message}`);
    }
  }
}
