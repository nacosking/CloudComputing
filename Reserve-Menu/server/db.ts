import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || "postgres://user:pass@localhost:5432/db";

// ✅ Configure SSL for AWS RDS
export const pool = new Pool({ 
  connectionString,
  ssl: process.env.DATABASE_URL ? {
    rejectUnauthorized: false  // Accept RDS self-signed certificates
  } : false
});

export const db = drizzle(pool, { schema });

console.log("✅ Database configured:", process.env.DATABASE_URL ? "RDS PostgreSQL with SSL" : "Local fallback");