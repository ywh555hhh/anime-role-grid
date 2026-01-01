/**
 * @file shared/schema/api.ts
 * @description API Communication Standards
 * Defines the envelope for all API responses and shared headers.
 */
import { z } from 'zod';

// =============================================================================
// 1. Authentication Headers
// =============================================================================
// The stateless identity header.
// Frontend generates a hash (IP + UserAgent + Salt) and sends it in this header.
export const AuthHeaderSchema = z.object({
    'x-user-hash': z.string().min(8).max(128).describe('Anonymous User Hash'),
});

// =============================================================================
// 2. Standard API Response Envelope
// =============================================================================
/**
 * Generic success response structure
 * Note: Zod doesn't support generic types well for runtime validation schemas directly,
 * so we export a helper type definition for usage in code.
 */
export interface ApiResponseSuccess<T> {
    success: true;
    data: T;
}

export interface ApiErrorDetail {
    code: string; // Machine readable e.g. "VALIDATION_ERROR"
    message: string; // Human readable (or localization key)
    path?: (string | number)[]; // Path to the invalid field (from Zod)
}

export interface ApiResponseError {
    success: false;
    error: {
        code: string;
        message: string;
        details?: ApiErrorDetail[];
    };
}

export type ApiResponse<T> = ApiResponseSuccess<T> | ApiResponseError;

// =============================================================================
// 3. Error Codes (Constants)
// =============================================================================
export const API_ERROR_CODES = {
    VALIDATION_ERROR: 'VALIDATION_ERROR', // 400 Bad Request
    UNAUTHORIZED: 'UNAUTHORIZED',         // 401 Unauthorized
    FORBIDDEN: 'FORBIDDEN',               // 403 Forbidden
    NOT_FOUND: 'NOT_FOUND',               // 404 Not Found
    INTERNAL_ERROR: 'INTERNAL_ERROR',     // 500 Internal Server Error
    RATE_LIMIT: 'RATE_LIMIT',             // 429 Too Many Requests
} as const;
