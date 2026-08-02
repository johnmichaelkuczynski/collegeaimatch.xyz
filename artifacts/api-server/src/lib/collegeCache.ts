import { db, collegeCacheTable } from "@workspace/db";
import { and, eq, gt } from "drizzle-orm";

const CACHE_TTL_DAYS = 30;

function expiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + CACHE_TTL_DAYS);
  return d;
}

/**
 * Retrieve a cached value for a college + key. Returns null if missing or expired.
 */
export async function getCached<T>(
  collegeId: number,
  cacheKey: string
): Promise<T | null> {
  const now = new Date();
  const [row] = await db
    .select()
    .from(collegeCacheTable)
    .where(
      and(
        eq(collegeCacheTable.collegeId, collegeId),
        eq(collegeCacheTable.cacheKey, cacheKey),
        gt(collegeCacheTable.expiresAt, now)
      )
    )
    .limit(1);

  if (!row) return null;
  return row.data as T;
}

/**
 * Store (or replace) a cached value for a college + key with a 30-day TTL.
 */
export async function setCached<T>(
  collegeId: number,
  cacheKey: string,
  data: T
): Promise<void> {
  await db
    .insert(collegeCacheTable)
    .values({
      collegeId,
      cacheKey,
      data: data as Record<string, unknown>,
      expiresAt: expiresAt(),
    })
    .onConflictDoUpdate({
      target: [collegeCacheTable.collegeId, collegeCacheTable.cacheKey],
      set: {
        data: data as Record<string, unknown>,
        createdAt: new Date(),
        expiresAt: expiresAt(),
      },
    });
}

/**
 * Delete all cache entries for a college (force-refresh all AI data).
 */
export async function invalidateCollegeCache(collegeId: number): Promise<void> {
  await db
    .delete(collegeCacheTable)
    .where(eq(collegeCacheTable.collegeId, collegeId));
}
