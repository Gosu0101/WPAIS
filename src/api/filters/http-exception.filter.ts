import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ErrorResponseDto, ValidationErrorDto } from '../dto/common';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const errorResponse: ErrorResponseDto = {
      statusCode: status,
      message: this.extractMessage(exceptionResponse),
      error: this.getErrorName(status),
      timestamp: new Date().toISOString(),
      path: request.url,
    };

    const details = this.extractValidationDetails(exceptionResponse);
    if (details) {
      errorResponse.details = details;
    }

    response.status(status).json(errorResponse);
  }

  private extractMessage(exceptionResponse: string | object): string {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }
    const response = exceptionResponse as Record<string, unknown>;
    if (Array.isArray(response.message)) {
      return response.message[0] || 'Validation failed';
    }
    return (response.message as string) || 'An error occurred';
  }

  private extractValidationDetails(
    exceptionResponse: string | object,
  ): ValidationErrorDto[] | undefined {
    if (typeof exceptionResponse === 'string') {
      return undefined;
    }
    const response = exceptionResponse as Record<string, unknown>;
    if (Array.isArray(response.message) && response.message.length > 0) {
      const grouped = new Map<string, string[]>();
      for (const msg of response.message) {
        const parts = String(msg).split(' ');
        const field = parts[0] || 'unknown';
        if (!grouped.has(field)) {
          grouped.set(field, []);
        }
        grouped.get(field)!.push(String(msg));
      }
      return Array.from(grouped.entries()).map(([field, messages]) => ({
        field,
        messages,
      }));
    }
    return undefined;
  }

  private getErrorName(status: number): string {
    const errorNames: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: 'Bad Request',
      [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
      [HttpStatus.FORBIDDEN]: 'Forbidden',
      [HttpStatus.NOT_FOUND]: 'Not Found',
      [HttpStatus.CONFLICT]: 'Conflict',
      [HttpStatus.UNPROCESSABLE_ENTITY]: 'Unprocessable Entity',
      [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
    };
    return errorNames[status] || 'Error';
  }
}
