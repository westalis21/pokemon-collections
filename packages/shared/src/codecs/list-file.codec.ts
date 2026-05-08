import { z } from 'zod';
import {
  FILE_ERROR_CODES,
  type FormatError,
  type ListFileItemV1,
  type ListFileV1,
} from '../types/list-file';

const itemSchema = z.object({
  pokemonId: z.number().int().positive(),
  name: z.string().min(1),
  weight: z.number().int().nonnegative(),
});

const v1Schema = z.object({
  schemaVersion: z.literal(1),
  name: z.string().min(1).max(80),
  items: z.array(itemSchema),
});

const versionProbe = z.object({
  schemaVersion: z.number(),
});

export type DecodeResult =
  | { ok: true; value: ListFileV1 }
  | { ok: false; error: FormatError };

export const ListFileCodec = {
  encode(input: { name: string; items: ListFileItemV1[] }): string {
    const file: ListFileV1 = {
      schemaVersion: 1,
      name: input.name,
      items: input.items.map(({ pokemonId, name, weight }) => ({
        pokemonId,
        name,
        weight,
      })),
    };
    return JSON.stringify(file, null, 2);
  },

  decode(text: string): DecodeResult {
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      return {
        ok: false,
        error: {
          code: FILE_ERROR_CODES.INVALID_FILE_FORMAT,
          message: 'File is not valid JSON.',
        },
      };
    }

    const probe = versionProbe.safeParse(raw);
    if (!probe.success) {
      return {
        ok: false,
        error: {
          code: FILE_ERROR_CODES.INVALID_FILE_FORMAT,
          message: 'File is missing or has an invalid schemaVersion.',
        },
      };
    }

    if (probe.data.schemaVersion !== 1) {
      return {
        ok: false,
        error: {
          code: FILE_ERROR_CODES.UNSUPPORTED_FILE_VERSION,
          message: `Unsupported schema version: ${probe.data.schemaVersion}.`,
        },
      };
    }

    const parsed = v1Schema.safeParse(raw);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: FILE_ERROR_CODES.INVALID_FILE_FORMAT,
          message: 'File contents do not match the v1 schema.',
        },
      };
    }
    return { ok: true, value: parsed.data };
  },
};
