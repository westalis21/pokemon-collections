import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { PokemonCacheService } from './pokemon-cache.service';
import { ListPokemonQueryDto } from './dto/list-pokemon.query.dto';

@Controller('pokemon')
export class PokemonController {
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
      throw new NotFoundException((err as Error).message);
    }
  }
}
