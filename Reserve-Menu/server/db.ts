import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL || "postgres://user:pass@localhost:5432/db";

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });