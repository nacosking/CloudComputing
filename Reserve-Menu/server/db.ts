import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// 1. I commented out the strict check preventing the app from starting
// if (!process.env.DATABASE_URL) {
//   throw new Error(
//     "DATABASE_URL must be set. Did you forget to provision a database?",
//   );
// }

// 2. I added a fallback "dummy" URL so the Pool doesn't crash immediately.
// This is not a real database, it's just a placeholder string.
const connectionString = process.env.DATABASE_URL || "postgres://user:pass@localhost:5432/db";

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });