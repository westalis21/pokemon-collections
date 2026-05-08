import {
  ArgumentsHost,
  BadRequestException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { HttpExceptionFilter } from './http-exception.filter';
import { ValidationException } from '../exceptions/validation.exception';

const buildHost = () => {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status };
  const host = {
    switchToHttp: () => ({ getResponse: () => response }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
};

describe('HttpExceptionFilter', () => {
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    filter = new HttpExceptionFilter();
  });

  it('preserves a ValidationException error array verbatim', () => {
    const { host, status, json } = buildHost();
    const exception = new ValidationException([
      { code: 'MIN_SPECIES', message: 'Need three species.' },
      { code: 'WEIGHT_EXCEEDED', message: 'Too heavy.' },
    ]);

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      errors: [
        { code: 'MIN_SPECIES', message: 'Need three species.' },
        { code: 'WEIGHT_EXCEEDED', message: 'Too heavy.' },
      ],
    });
  });

  it('wraps a class-validator BadRequestException into the envelope', () => {
    const { host, status, json } = buildHost();
    const exception = new BadRequestException({
      message: ['name should not be empty', 'pokemonIds must be an array'],
      error: 'Bad Request',
      statusCode: 400,
    });

    filter.catch(exception, host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      errors: [
        { code: 'VALIDATION_ERROR', message: 'name should not be empty' },
        { code: 'VALIDATION_ERROR', message: 'pokemonIds must be an array' },
      ],
    });
  });

  it('falls back to a single VALIDATION_ERROR for a plain string message', () => {
    const { host, status, json } = buildHost();

    filter.catch(new BadRequestException('id must be a number'), host);

    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.BAD_REQUEST,
      errors: [{ code: 'VALIDATION_ERROR', message: 'id must be a number' }],
    });
  });

  it('returns INTERNAL_SERVER_ERROR for unknown HttpException codes', () => {
    const { host, status, json } = buildHost();

    filter.catch(
      new HttpException('boom', HttpStatus.INTERNAL_SERVER_ERROR),
      host,
    );

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(json).toHaveBeenCalledWith({
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      errors: [{ code: 'INTERNAL_ERROR', message: 'boom' }],
    });
  });
});
