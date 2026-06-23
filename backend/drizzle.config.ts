import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

export default defineConfig({
  dialect: "postgresql",
  schema: "./dist/db/schema/index.js",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgres://postgres:securepassword@localhost:5433/citioyen",
  },
});
