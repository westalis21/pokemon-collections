export const MAX_TOTAL_WEIGHT = 1300;
export const MIN_UNIQUE_SPECIES = 3;

export const VALIDATION_ERROR_CODES = {
  MIN_SPECIES: 'MIN_SPECIES',
  WEIGHT_EXCEEDED: 'WEIGHT_EXCEEDED',
} as const;

export type ValidationErrorCode =
  (typeof VALIDATION_ERROR_CODES)[keyof typeof VALIDATION_ERROR_CODES];

export interface ListValidationError {
  code: ValidationErrorCode;
  message: string;
}

export type ListValidationResult =
  | { ok: true }
  | { ok: false; errors: ListValidationError[] };

export interface ValidatableItem {
  pokemonId: number;
  weight: number;
}

export const ListValidator = {
  validate(items: ValidatableItem[]): ListValidationResult {
    const errors: ListValidationError[] = [];

    const uniqueSpecies = new Set(items.map((i) => i.pokemonId));
    if (uniqueSpecies.size < MIN_UNIQUE_SPECIES) {
      errors.push({
        code: VALIDATION_ERROR_CODES.MIN_SPECIES,
        message: `List must contain at least ${MIN_UNIQUE_SPECIES} different species.`,
      });
    }

    const totalWeight = items.reduce((sum, i) => sum + i.weight, 0);
    if (totalWeight > MAX_TOTAL_WEIGHT) {
      errors.push({
        code: VALIDATION_ERROR_CODES.WEIGHT_EXCEEDED,
        message: `Total weight ${totalWeight} exceeds the maximum of ${MAX_TOTAL_WEIGHT} hectograms.`,
      });
    }

    return errors.length === 0 ? { ok: true } : { ok: false, errors };
  },
};
