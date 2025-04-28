"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorResponse = errorResponse;
exports.successResponse = successResponse;
exports.requireAuth = requireAuth;
/**
 * Standardized error response for callable functions
 */
function errorResponse(message, code = 'internal') {
    return {
        status: 'error',
        code,
        message,
    };
}
/**
 * Standardized success response for callable functions
 */
function successResponse(data) {
    return {
        status: 'success',
        data,
    };
}
/**
 * Middleware to require Firebase authentication for callable functions
 */
function requireAuth(request) {
    if (!request.auth || !request.auth.uid) {
        throw new Error('Authentication required');
    }
}
