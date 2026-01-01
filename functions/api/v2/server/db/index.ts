import { drizzle } from 'drizzle-orm/d1';
import * as schema from './schema';

export interface Env {
    DB: D1Database;
}

// Singleton-like factory pattern for Serverless
// We pass the binding 'DB' from the request context to this function.
export const createDb = (d1: D1Database) => {
    return drizzle(d1, { schema });
};

// Type helper
export type Database = ReturnType<typeof createDb>;
