import { pgTable, uuid, text } from "drizzle-orm/pg-core";

export const wards = pgTable("wards", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  city: text("city").notNull(),
});
