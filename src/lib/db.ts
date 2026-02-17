import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
  connectionString,
  max: 20,                     // Maximum number of connections in the pool
  idleTimeoutMillis: 30000,    // Close idle connections after 30s
  connectionTimeoutMillis: 10000, // Fail fast if can't connect in 10s
  keepAlive: true,             // Keep connections alive to avoid reconnect overhead
  keepAliveInitialDelayMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Unexpected PostgreSQL pool error:', err.message);
});

const adapter = new PrismaPg(pool);

const RETRYABLE_CODES = new Set([
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'P1017',  // Prisma: Server has closed the connection
  'P2024',  // Prisma: Timed out fetching a new connection
]);

const MAX_RETRIES = 2;
const BASE_DELAY_MS = 500;

/**
 * Retry a database operation on transient errors (e.g. ETIMEDOUT).
 * Retries up to `maxRetries` times with exponential backoff.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries = MAX_RETRIES,
  baseDelayMs = BASE_DELAY_MS
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (!RETRYABLE_CODES.has(error?.code) || attempt === maxRetries) {
        throw error;
      }
      const delay = baseDelayMs * Math.pow(2, attempt);
      console.warn(
        `[DB Retry] Attempt ${attempt + 1}/${maxRetries} failed with ${error?.code}. Retrying in ${delay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}

// Extend PrismaClient with automatic retry on all queries
export const prisma = new PrismaClient({ adapter }).$extends({
  query: {
    async $allOperations({ args, query }) {
      return withRetry(() => query(args));
    },
  },
});
