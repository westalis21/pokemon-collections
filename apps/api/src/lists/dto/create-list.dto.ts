import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsString,
  Length,
  Min,
} from 'class-validator';

export class CreateListDto {
  @IsString()
  @Length(1, 80)
  name!: string;

  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  @Min(1, { each: true })
  pokemonIds!: number[];
}
