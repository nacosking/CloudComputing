import { Pool } from "pg";
import { randomUUID } from "crypto";

const connectionString = process.env.DATABASE_URL || process.env.PG_CONNECTION_STRING;

if (!connectionString) {
    console.warn("DATABASE_URL is not set — DB operations will fail until configured");
}

export const pool = new Pool({ connectionString });

// Initialize database schema (creates tables if they don't exist)
export async function initializeDatabase() {
    const createTableSQL = `
        CREATE TABLE IF NOT EXISTS reservations (
            id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
            name TEXT NOT NULL,
            email TEXT NOT NULL,
            date TIMESTAMP NOT NULL,
            time VARCHAR(50) NOT NULL,
            guests INTEGER NOT NULL,
            image_url TEXT,
            status VARCHAR(50) NOT NULL DEFAULT 'pending',
            created_at TIMESTAMP DEFAULT NOW()
        );
    `;
    
    try {
        await pool.query(createTableSQL);
        console.log("Database schema initialized successfully");
    } catch (error) {
        console.error("Failed to initialize database schema:", error);
        throw error;
    }
}

export async function insertReservation(reservation: {
    name: string;
    email: string;
    date: string; // ISO
    time: string;
    guests: number;
}) {
    const id = randomUUID();
    const sql = `INSERT INTO reservations(id, name, email, date, time, guests, status, created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8)`;
    const params = [id, reservation.name, reservation.email, reservation.date, reservation.time, reservation.guests, 'pending_payment', new Date().toISOString()];
    await pool.query(sql, params);
    return { id };
}

export async function confirmReservation(id: string, imageUrl?: string) {
    const sql = `UPDATE reservations SET status = $1, image_url = $2 WHERE id = $3`;
    const params = ['confirmed', imageUrl || null, id];
    await pool.query(sql, params);
    return { id };
}

export async function listReservations(limit = 100) {
    const { rows } = await pool.query(`SELECT * FROM reservations ORDER BY created_at DESC LIMIT $1`, [limit]);
    return rows;
}
