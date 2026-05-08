import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { List, ListSchema } from './schemas/list.schema';
import { ListsController } from './lists.controller';
import { ListsService } from './lists.service';
import { PokemonCoreModule } from '../pokemon/pokemon-core.module';

@Module({
  imports: [
    PokemonCoreModule,
    MongooseModule.forFeature([{ name: List.name, schema: ListSchema }]),
  ],
  controllers: [ListsController],
  providers: [ListsService],
  exports: [ListsService],
})
export class ListsModule {}
