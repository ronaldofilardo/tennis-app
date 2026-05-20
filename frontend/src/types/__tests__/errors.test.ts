import { describe, it, expect } from 'vitest';
import {
  getErrorMessage,
  isHttpError,
  extractHttpError,
  extractValidationErrors,
  type HttpError,
} from '../errors';

describe('error handling utilities', () => {
  describe('getErrorMessage', () => {
    it('deve extrair mensagem de Error instance', () => {
      const error = new Error('Test error message');
      const msg = getErrorMessage(error);
      expect(msg).toBe('Test error message');
    });

    it('deve retornar string diretamente', () => {
      const msg = getErrorMessage('Direct error string');
      expect(msg).toBe('Direct error string');
    });

    it('deve extrair mensagem de HTTP error response', () => {
      const httpErr = {
        response: {
          data: { error: 'HTTP error message' },
        },
      };
      const msg = getErrorMessage(httpErr);
      expect(msg).toBe('HTTP error message');
    });

    it('deve retornar fallback para unknown types', () => {
      const msg = getErrorMessage({ someField: 'value' });
      expect(msg).toBeDefined();
      expect(typeof msg).toBe('string');
    });

    it('deve handle null/undefined', () => {
      const msgNull = getErrorMessage(null);
      const msgUndef = getErrorMessage(undefined);
      expect(msgNull).toBeDefined();
      expect(msgUndef).toBeDefined();
    });
  });

  describe('isHttpError', () => {
    it('deve validar HttpError structure', () => {
      const validError: HttpError = {
        response: {
          status: 400,
          data: { error: 'Bad request' },
        },
        message: 'HTTP error',
      };
      expect(isHttpError(validError)).toBe(true);
    });

    it('deve rejeitar objeto sem response', () => {
      expect(isHttpError({ message: 'Error' })).toBe(false);
    });

    it('deve rejeitar non-objects', () => {
      expect(isHttpError('error string')).toBe(false);
      expect(isHttpError(123)).toBe(false);
      expect(isHttpError(null)).toBe(false);
    });
  });

  describe('extractHttpError', () => {
    it('deve extrair status e message de HttpError', () => {
      const error: HttpError = {
        response: {
          status: 404,
          data: { error: 'Not found' },
        },
        message: 'Not found',
      };
      const extracted = extractHttpError(error);
      expect(extracted.status).toBe(404);
      expect(extracted.message).toBe('Not found');
    });

    it('deve usar fallback para tipo inválido', () => {
      const extracted = extractHttpError('invalid');
      expect(extracted.message).toBeDefined();
      expect(typeof extracted.message).toBe('string');
    });
  });

  describe('extractValidationErrors', () => {
    it('deve extrair erros de validação de response data', () => {
      const errorResponse: HttpError = {
        response: {
          status: 422,
          data: {
            email: 'Invalid email',
            password: 'Too short',
          },
        },
        message: 'Validation error',
      };
      const errors = extractValidationErrors(errorResponse);
      expect(errors.email).toBe('Invalid email');
      expect(errors.password).toBe('Too short');
    });

    it('deve retornar objeto vazio para type inválido', () => {
      const errors = extractValidationErrors('not an error response');
      expect(errors).toEqual({});
    });

    it('deve ignorar campos error/message', () => {
      const errorResponse: HttpError = {
        response: {
          status: 422,
          data: {
            error: 'Generic error',
            message: 'Generic message',
            fieldError: 'Field specific error',
          },
        },
        message: 'Validation error',
      };
      const errors = extractValidationErrors(errorResponse);
      // error e message não devem ser inclusos
      expect(errors.error).toBeUndefined();
      expect(errors.message).toBeUndefined();
      expect(errors.fieldError).toBe('Field specific error');
    });
  });
});
