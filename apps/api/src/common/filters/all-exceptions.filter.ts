import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorResponseBody {
  statusCode: number;
  message: string | string[];
  error: string;
  path: string;
  timestamp: string;
}

// @Catch() ไม่ระบุ type -> ครอบทุก exception ที่เกิดขึ้นในระบบ (ทั้งที่คาดไว้แล้วและที่ไม่คาดคิด)
// ทำให้ทุก error response ออกมาเป็น format เดียวกันเสมอ ไม่ว่าจะ throw NotFoundException, ValidationPipe error, หรือ error อื่นที่ไม่ได้ตั้งใจ
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    let message: string | string[] = 'เกิดข้อผิดพลาดบางอย่าง กรุณาลองใหม่ภายหลัง';
    if (isHttpException) {
      const body = exception.getResponse();
      // ValidationPipe (class-validator) throw BadRequestException ที่ getResponse() คืน { message: string[] }
      // ส่วน exception ทั่วไป เช่น NotFoundException คืน { message: string } หรือ string ตรง ๆ
      message =
        typeof body === 'string'
          ? body
          : ((body as { message?: string | string[] }).message ?? exception.message);
    } else {
      // error ที่ไม่คาดคิด (เช่น bug, DB connection พัง) -> log ฝั่ง server ไว้ debug
      // แต่ไม่ส่ง stack trace หรือรายละเอียดภายในออกไปให้ client เห็นเด็ดขาด (security)
      console.error(exception);
    }

    const body: ErrorResponseBody = {
      statusCode: status,
      message,
      error: isHttpException ? exception.constructor.name : 'InternalServerError',
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(body);
  }
}
