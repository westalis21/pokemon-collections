import {
  Controller,
  Get,
  Logger,
  NotFoundException,
  Param,
  Query,
} from '@nestjs/common';
import { PokemonCacheService } from './pokemon-cache.service';
import { ListPokemonQueryDto } from './dto/list-pokemon.query.dto';

@Controller('pokemon')
export class PokemonController {
  private readonly logger = new Logger(PokemonController.name);

  constructor(private readonly cache: PokemonCacheService) {}

  @Get()
  list(@Query() query: ListPokemonQueryDto) {
    return this.cache.search(query);
  }

  @Get(':idOrName')
  async getOne(@Param('idOrName') idOrName: string) {
    try {
      return await this.cache.getOneByIdOrName(idOrName);
    } catch (err) {
      this.logger.warn(
        `Pokemon lookup failed for "${idOrName}": ${(err as Error).message}`,
      );
      throw new NotFoundException(`Pokemon "${idOrName}" not found.`);
    }
  }
}
