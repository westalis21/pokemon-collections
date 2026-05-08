import { BadRequestException } from '@nestjs/common';
import type { ApiErrorPayload } from './validation.exception';

export class FormatException extends BadRequestException {
  constructor(public readonly error: ApiErrorPayload) {
    super({ errors: [error] });
  }
}
