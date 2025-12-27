import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// ✅ Force the app to use the RDS URL
if (!process.env.DATABASE_URL) {
    throw new Error("CRITICAL: DATABASE_URL environment variable is missing!");
}

export const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

export const db = drizzle(pool, { schema });

console.log("🚀 Connected to RDS PostgreSQL");