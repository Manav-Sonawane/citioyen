import { pgTable, uuid, text } from "drizzle-orm/pg-core";

export const wards = pgTable("wards", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  city: text("city").notNull(),
});
