import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// 1. ENABLE STRICT CHECK
// In production, if this is missing, your app is useless. 
// It is better to crash instantly so you know something is wrong.
if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Check your .env file or AWS PM2 configuration.",
  );
}

// 2. Create the Connection Pool
// We simply use the environment variable directly.
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
});

// 3. Export Drizzle
export const db = drizzle(pool, { schema });