import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PokemonCacheService } from './pokemon-cache.service';
import { PokemonController } from './pokemon.controller';
import { PokemonCoreModule } from './pokemon-core.module';

@Module({
  imports: [PokemonCoreModule],
  controllers: [PokemonController],
  exports: [PokemonCoreModule],
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
    const limit = Number(this.config.get<string>('WARMUP_LIMIT') ?? 2000);
    try {
      await this.cache.warmup(limit);
    } catch (err) {
      this.logger.warn(`Pokemon cache warmup failed: ${(err as Error).message}`);
    }
  }
}
