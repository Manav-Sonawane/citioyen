import { pgTable, uuid, text, integer } from "drizzle-orm/pg-core";
export const categories = pgTable("categories", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: text("name").notNull().unique(),
    department: text("department").notNull(),
    defaultSlaHours: integer("default_sla_hours").notNull(),
    icon: text("icon"),
});
