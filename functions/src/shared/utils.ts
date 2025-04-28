// Shared utilities for Firebase Functions
import { CallableRequest } from 'firebase-functions/v2/https';

/**
 * Standardized error response for callable functions
 */
export function errorResponse(message: string, code: string = 'internal') {
  return {
    status: 'error',
    code,
    message,
  };
}

/**
 * Standardized success response for callable functions
 */
export function successResponse(data: any) {
  return {
    status: 'success',
    data,
  };
}

/**
 * Middleware to require Firebase authentication for callable functions
 */
export function requireAuth(request: CallableRequest<any>) {
  if (!request.auth || !request.auth.uid) {
    throw new Error('Authentication required');
  }
}
