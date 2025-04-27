// Shared utilities for Firebase Functions
import * as functions from 'firebase-functions';

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
export function requireAuth(context: functions.https.CallableContext) {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Authentication required.');
  }
  return context.auth;
}
