import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { Response } from 'express';
import { FormatException } from '../exceptions/format.exception';

/**
 * Rewraps multer/Nest's PayloadTooLargeException (HTTP 413) for the upload
 * endpoint so it surfaces through the standard error envelope as a 400 with
 * code INVALID_FILE_FORMAT.
 */
@Catch(PayloadTooLargeException)
export class UploadErrorFilter implements ExceptionFilter {
  catch(_exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const wrapped = new FormatException({
      code: 'INVALID_FILE_FORMAT',
      message: 'File too large.',
    });
    const status = wrapped.getStatus();
    const payload = wrapped.getResponse() as {
      errors: { code: string; message: string }[];
    };
    response.status(status).json({ statusCode: status, errors: payload.errors });
  }
}
