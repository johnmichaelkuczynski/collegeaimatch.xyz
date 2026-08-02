import {
  pgTable,
  serial,
  text,
  integer,
  real,
  boolean,
  index,
} from "drizzle-orm/pg-core";

export const collegesTable = pgTable(
  "colleges",
  {
    id: serial("id").primaryKey(),
    unitid: integer("unitid").unique(),
    name: text("name").notNull(),
    city: text("city").notNull().default(""),
    state: text("state").notNull().default(""),
    type: text("type").notNull().default("four_year"), // community_college | four_year | university | for_profit | specialty | technical | lower_tier
    control: integer("control").notNull().default(1), // 1=public, 2=private nonprofit, 3=for-profit
    carnegieBasic: integer("carnegie_basic"),
    icLevel: integer("ic_level"), // 1=4-year, 2=2-year, 3=<2-year
    enrollmentSize: integer("enrollment_size").notNull().default(0),
    url: text("url"),
    tuitionInState: integer("tuition_in_state"),
    tuitionOutOfState: integer("tuition_out_of_state"),
    completionRate: real("completion_rate"),
    retentionRate: real("retention_rate"),
    medianDebt: integer("median_debt"),
    aiOpportunityScore: integer("ai_opportunity_score").notNull().default(50),
    isActive: boolean("is_active").notNull().default(true),
  },
  (t) => [
    index("colleges_name_idx").on(t.name),
    index("colleges_state_idx").on(t.state),
    index("colleges_type_idx").on(t.type),
  ]
);
