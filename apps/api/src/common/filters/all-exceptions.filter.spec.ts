import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArgumentsHost, BadRequestException, NotFoundException } from '@nestjs/common';
import { AllExceptionsFilter } from './all-exceptions.filter.js';

function createMockHost(url: string) {
  const jsonMock = vi.fn();
  const statusMock = vi.fn(() => ({ json: jsonMock }));
  const host = {
    switchToHttp: () => ({
      getResponse: () => ({ status: statusMock }),
      getRequest: () => ({ url }),
    }),
  } as unknown as ArgumentsHost;
  return { host, statusMock, jsonMock };
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('should format a NotFoundException with matching status and message', () => {
    const { host, statusMock, jsonMock } = createMockHost('/products/99');
    filter.catch(new NotFoundException('ไม่พบสินค้า id: 99'), host);

    expect(statusMock).toHaveBeenCalledWith(404);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'ไม่พบสินค้า id: 99',
        error: 'NotFoundException',
        path: '/products/99',
      }),
    );
  });

  it('should format a validation BadRequestException (message: string[]) correctly', () => {
    const { host, statusMock, jsonMock } = createMockHost('/products');
    filter.catch(new BadRequestException(['limit ต้องไม่เกิน 100 ต่อครั้ง']), host);

    expect(statusMock).toHaveBeenCalledWith(400);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: ['limit ต้องไม่เกิน 100 ต่อครั้ง'],
      }),
    );
  });

  it('should map an unexpected error to 500 without leaking internals', () => {
    const { host, statusMock, jsonMock } = createMockHost('/products');
    filter.catch(new Error('some internal db failure with a stack trace'), host);

    expect(statusMock).toHaveBeenCalledWith(500);
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        error: 'InternalServerError',
      }),
    );
    // ไม่ leak ข้อความ error ภายในออกไปให้ client
    const body = jsonMock.mock.calls[0][0];
    expect(body.message).not.toContain('stack trace');
    expect(consoleErrorSpy).toHaveBeenCalled(); // แต่ log ไว้ฝั่ง server
  });
});
