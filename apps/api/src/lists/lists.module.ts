import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { List, ListSchema } from './schemas/list.schema';
import { ListsController } from './lists.controller';
import { ListsService } from './lists.service';
import { PokemonModule } from '../pokemon/pokemon.module';

@Module({
  imports: [
    PokemonModule,
    MongooseModule.forFeature([{ name: List.name, schema: ListSchema }]),
  ],
  controllers: [ListsController],
  providers: [ListsService],
  exports: [ListsService],
})
export class ListsModule {}
