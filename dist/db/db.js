import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";
const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL || "postgres://postgres:securepassword@localhost:5433/citioyen",
});
export const db = drizzle(pool, { schema });
