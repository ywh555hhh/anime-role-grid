/**
 * src/v3/core/utils/id.ts
 * Identity Utilities
 */
import type { EntityId } from '../ecs/types';

/**
 * Generates a branded EntityId using crypto.randomUUID
 */
export function generateEntityId(): EntityId {
    // In strict environments, ensure crypto is available
    if (typeof crypto === 'undefined' || typeof crypto.randomUUID !== 'function') {
        // Fallback or Error for older environments (unlikely in modern web)
        throw new Error('Secure Context required: crypto.randomUUID is missing');
    }
    return crypto.randomUUID() as EntityId;
}
