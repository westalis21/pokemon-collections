export const FILE_ERROR_CODES = {
  INVALID_FILE_FORMAT: 'INVALID_FILE_FORMAT',
  UNSUPPORTED_FILE_VERSION: 'UNSUPPORTED_FILE_VERSION',
} as const;

export type FileErrorCode =
  (typeof FILE_ERROR_CODES)[keyof typeof FILE_ERROR_CODES];

export interface FormatError {
  code: FileErrorCode;
  message: string;
}

export interface ListFileItemV1 {
  pokemonId: number;
  name: string;
  weight: number;
}

export interface ListFileV1 {
  schemaVersion: 1;
  name: string;
  items: ListFileItemV1[];
}
