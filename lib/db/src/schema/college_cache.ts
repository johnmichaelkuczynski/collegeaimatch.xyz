import {
  pgTable,
  serial,
  integer,
  text,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";

/**
 * Cache for AI-generated college data (courses, contacts, popular_majors).
 * Keyed by (college_id, cache_key). TTL is stored as `expires_at`.
 *
 * cache_key examples:
 *   "courses"            – all courses, no subject filter
 *   "courses:math"       – courses filtered to "math" subject
 *   "contacts"           – leadership contacts
 *   "popular_majors"     – popular majors list
 */
export const collegeCacheTable = pgTable(
  "college_cache",
  {
    id: serial("id").primaryKey(),
    collegeId: integer("college_id").notNull(),
    cacheKey: text("cache_key").notNull(),
    data: jsonb("data").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    expiresAt: timestamp("expires_at").notNull(),
  },
  (t) => [
    uniqueIndex("college_cache_college_key_idx").on(t.collegeId, t.cacheKey),
    index("college_cache_expires_idx").on(t.expiresAt),
  ]
);
