import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ collection: 'pokemon_cache' })
export class PokemonCache {
  @Prop({ required: true, unique: true, index: true })
  id!: number;

  @Prop({ required: true, index: true })
  name!: string;

  @Prop()
  weight?: number;

  @Prop()
  sprite?: string;

  @Prop({ type: [String], default: [] })
  types!: string[];

  @Prop()
  fetchedAt?: Date;
}

export type PokemonCacheDocument = HydratedDocument<PokemonCache>;
export const PokemonCacheSchema = SchemaFactory.createForClass(PokemonCache);
PokemonCacheSchema.index({ name: 'text' });
