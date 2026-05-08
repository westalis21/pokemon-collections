import { BadRequestException } from '@nestjs/common';

export interface ApiErrorPayload {
  code: string;
  message: string;
}

export class ValidationException extends BadRequestException {
  constructor(public readonly errors: ApiErrorPayload[]) {
    super({ errors });
  }
}
