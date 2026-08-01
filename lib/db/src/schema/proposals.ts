import { pgTable, serial, text, jsonb, timestamp } from "drizzle-orm/pg-core";

export const proposalsTable = pgTable("proposals", {
  id: serial("id").primaryKey(),
  collegeId: text("college_id"),
  collegeName: text("college_name").notNull(),
  collegeState: text("college_state").notNull().default(""),
  courses: jsonb("courses").default([]),
  contacts: jsonb("contacts").default([]),
  aiVirtues: jsonb("ai_virtues").default([]),
  outreachLetter: text("outreach_letter").notNull(),
  costAnalysis: jsonb("cost_analysis").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
