import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import type { ApiErrorPayload } from '../exceptions/validation.exception';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      response
        .status(status)
        .json({ statusCode: status, errors: this.toErrors(status, payload) });
      return;
    }

    this.logger.error(
      'Unhandled exception',
      exception instanceof Error ? exception.stack : String(exception),
    );
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errors: [{ code: 'INTERNAL_ERROR', message: 'Unexpected error.' }],
    });
  }

  private toErrors(status: number, payload: unknown): ApiErrorPayload[] {
    if (this.isErrorsEnvelope(payload)) {
      return payload.errors;
    }

    if (this.isClassValidatorEnvelope(payload)) {
      return payload.message.map((message) => ({
        code: 'VALIDATION_ERROR',
        message,
      }));
    }

    if (typeof payload === 'object' && payload !== null && 'message' in payload) {
      const message = (payload as { message: unknown }).message;
      if (typeof message === 'string') {
        return [{ code: this.fallbackCode(status), message }];
      }
    }

    if (typeof payload === 'string') {
      return [{ code: this.fallbackCode(status), message: payload }];
    }

    return [{ code: this.fallbackCode(status), message: 'Unexpected error.' }];
  }

  private fallbackCode(status: number): string {
    return status >= HttpStatus.INTERNAL_SERVER_ERROR
      ? 'INTERNAL_ERROR'
      : 'VALIDATION_ERROR';
  }

  private isErrorsEnvelope(
    value: unknown,
  ): value is { errors: ApiErrorPayload[] } {
    return (
      typeof value === 'object' &&
      value !== null &&
      Array.isArray((value as { errors?: unknown }).errors)
    );
  }

  private isClassValidatorEnvelope(
    value: unknown,
  ): value is { message: string[] } {
    return (
      typeof value === 'object' &&
      value !== null &&
      Array.isArray((value as { message?: unknown }).message)
    );
  }
}
