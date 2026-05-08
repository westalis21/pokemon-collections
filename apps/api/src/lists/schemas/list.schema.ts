import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

@Schema({ _id: false })
export class PokemonSnapshotEmbed {
  @Prop({ required: true })
  pokemonId!: number;

  @Prop({ required: true })
  name!: string;

  @Prop({ required: true })
  weight!: number;

  @Prop({ required: true })
  sprite!: string;
}

const PokemonSnapshotEmbedSchema =
  SchemaFactory.createForClass(PokemonSnapshotEmbed);

@Schema({ collection: 'lists', timestamps: { createdAt: true, updatedAt: false } })
export class List {
  @Prop({ required: true, minlength: 1, maxlength: 80 })
  name!: string;

  @Prop({ type: [PokemonSnapshotEmbedSchema], default: [] })
  items!: PokemonSnapshotEmbed[];

  createdAt!: Date;
}

export type ListDocument = HydratedDocument<List>;
export const ListSchema = SchemaFactory.createForClass(List);
ListSchema.index({ createdAt: -1 });
