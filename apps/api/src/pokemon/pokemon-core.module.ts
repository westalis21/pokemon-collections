import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import {
  PokemonCache,
  PokemonCacheSchema,
} from './schemas/pokemon-cache.schema';
import { PokeApiClient } from './poke-api.client';
import { PokemonCacheService } from './pokemon-cache.service';

/**
 * Mongo + cache wiring without the controller or warmup hook. Imported by
 * any module that needs PokemonCacheService without paying the warmup cost.
 */
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PokemonCache.name, schema: PokemonCacheSchema },
    ]),
  ],
  providers: [PokeApiClient, PokemonCacheService],
  exports: [PokemonCacheService, MongooseModule],
})
export class PokemonCoreModule {}
