/**
 * Centralized error handling utilities
 * Provides type-safe error extraction and validation
 */

/**
 * Extract a human-readable error message from any error type
 * Implements proper type guards for unknown errors
 */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    return err.message;
  }

  if (typeof err === 'string') {
    return err;
  }

  if (err !== null && typeof err === 'object') {
    const errObj = err as Record<string, unknown>;

    // HTTP response error pattern
    if (errObj.response && typeof errObj.response === 'object') {
      const response = errObj.response as Record<string, unknown>;
      if (response.data && typeof response.data === 'object') {
        const data = response.data as Record<string, unknown>;
        if (typeof data.error === 'string') {
          return data.error;
        }
        if (typeof data.message === 'string') {
          return data.message;
        }
      }
    }

    // Fallback: toString representation
    if (typeof errObj.message === 'string') {
      return errObj.message;
    }

    if (typeof errObj.toString === 'function') {
      return errObj.toString();
    }
  }

  return 'An unknown error occurred';
}

/**
 * Type guard for HTTP error responses
 */
export interface HttpError {
  response?: {
    status: number;
    data?: {
      error?: string;
      message?: string;
      [key: string]: unknown;
    };
  };
  message: string;
}

export function isHttpError(err: unknown): err is HttpError {
  return (
    err !== null &&
    typeof err === 'object' &&
    'response' in err &&
    (err as Record<string, unknown>).response !== null &&
    typeof (err as Record<string, unknown>).response === 'object'
  );
}

/**
 * Extract HTTP error details (status code, message)
 */
export function extractHttpError(err: unknown): { status?: number; message: string } {
  if (isHttpError(err)) {
    return {
      status: err.response?.status,
      message: getErrorMessage(err),
    };
  }

  return {
    message: getErrorMessage(err),
  };
}

/**
 * Extract validation errors from API response (assumes pattern: { fieldName: 'error message' })
 */
export function extractValidationErrors(err: unknown): Record<string, string> {
  if (isHttpError(err) && err.response?.data) {
    const data = err.response.data as Record<string, unknown>;
    const errors: Record<string, string> = {};

    for (const [key, value] of Object.entries(data)) {
      if (key !== 'error' && key !== 'message' && typeof value === 'string') {
        errors[key] = value;
      }
    }

    return errors;
  }

  return {};
}

/**
 * Standard error callback for hooks
 */
export type ErrorCallback = (err: unknown) => void;
