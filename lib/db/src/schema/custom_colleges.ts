import { pgTable, serial, text, timestamp, index } from "drizzle-orm/pg-core";

export const customCollegesTable = pgTable(
  "custom_colleges",
  {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    city: text("city").notNull().default(""),
    state: text("state").notNull().default(""),
    /** community_college | four_year | university | for_profit | specialty | technical | lower_tier */
    type: text("type").notNull().default("lower_tier"),
    /** Original filename the college was uploaded from */
    sourceFile: text("source_file"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("custom_colleges_name_idx").on(t.name),
    index("custom_colleges_state_idx").on(t.state),
  ]
);
