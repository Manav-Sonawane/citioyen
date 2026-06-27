import { pgTable, uuid, text } from "drizzle-orm/pg-core";

export const wards = pgTable("wards", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull().unique(),
  city: text("city").notNull(),
});

export const ward_aliases = pgTable("ward_aliases", {
  id: uuid("id").primaryKey().defaultRandom(),
  wardId: uuid("ward_id").notNull().references(() => wards.id, { onDelete: "cascade" }),
  areaName: text("area_name").notNull().unique(),
});
