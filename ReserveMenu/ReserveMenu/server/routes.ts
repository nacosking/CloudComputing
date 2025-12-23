import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { uploadToS3, listObjects } from "./s3";
import { randomUUID } from "crypto";
import { z } from "zod";
import { insertReservation, confirmReservation, listReservations } from "./db";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // 1. Configure Multer to store files in memory temporarily
  // This allows us to grab the file buffer and send it to S3
  const upload = multer({ storage: multer.memoryStorage() });

  // 2. API Route: Upload Image to S3
  // This endpoint accepts a POST request with a file named 'image'
  app.post("/api/upload", upload.single("image"), async (req, res) => {
    try {
      // Check if a file was actually sent
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const bucket = process.env.S3_BUCKET_NAME || "cloud-project-app-storage-382146695720";
      console.log(`Using S3 bucket for uploads: ${bucket}`);

      // Use a unique key for the uploaded image
      const key = `images/${Date.now()}-${randomUUID()}-${req.file.originalname}`;

      // Send the file to AWS S3 (using your s3.ts logic)
      const imageUrl = await uploadToS3(bucket, key, req.file.buffer);

      // Return the S3 URL to the frontend so it can display the image
      res.json({ url: imageUrl });
    } catch (error) {
      console.error("Upload Route Error:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // 3. API Route: Create Reservation (persist to RDS)
  const reservationSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    date: z.string().min(1),
    time: z.string().min(1),
    guests: z.preprocess((val) => {
      // allow number or string from the client
      if (typeof val === 'string') return parseInt(val, 10);
      return val;
    }, z.number().int().min(1)),
  });

  app.post("/api/reservations", async (req, res) => {
    try {
      const parsed = reservationSchema.parse(req.body);
      // Insert into Postgres RDS
      const { id } = await insertReservation(parsed as any);
      res.status(201).json({ id });
    } catch (error: any) {
      console.error("Reservations Route Error:", error);
      const message = error?.message || "Failed to create reservation";
      res.status(400).json({ message });
    }
  });

  // Confirm a reservation by attaching an image URL and marking confirmed
  app.post('/api/reservations/:id/confirm', async (req, res) => {
    try {
      const id = req.params.id;
      const { imageUrl } = req.body as { imageUrl?: string };
      await confirmReservation(id, imageUrl);
      res.json({ id });
    } catch (err: any) {
      console.error('Confirm reservation error:', err);
      res.status(500).json({ message: err?.message || 'Failed to confirm reservation' });
    }
  });

  // (Optional) Example: Get all users
  // app.get("/api/users", async (req, res) => {
  //   const users = await storage.getUserByUsername("admin");
  //   res.json(users);
  // });

  // Debug endpoint: lists reservation keys and performs a test write to diagnose permissions
  app.get("/api/reservations/debug", async (req, res) => {
    const bucket = process.env.S3_BUCKET_NAME || "cloud-project-app-storage-382146695720";
    console.log(`Reservations debug invoked for bucket: ${bucket}`);

    const result: { list?: any[]; writeTest?: { success: boolean; key?: string; error?: string } } = {};

    // 1) Try to list objects under reservations/
    try {
      const items = await listObjects(bucket, "reservations/");
      result.list = items;
    } catch (err: any) {
      console.error("Reservations debug list error:", err);
      result.list = [];
    }

    // 2) Attempt a test write
    try {
      const testKey = `reservations/debug-${Date.now()}-${randomUUID()}.json`;
      const payload = { test: true, time: new Date().toISOString() };
      await uploadToS3(bucket, testKey, Buffer.from(JSON.stringify(payload), "utf-8"));
      result.writeTest = { success: true, key: testKey };
    } catch (err: any) {
      console.error("Reservations debug write error:", err);
      result.writeTest = { success: false, error: err?.message || String(err) };
    }

    // ALSO list last N reservations from DB to help debug
    try {
      const dbRows = await listReservations(20);
      (result as any).db = dbRows;
    } catch (err: any) {
      console.error('Reservations debug DB list error:', err);
      (result as any).db = [];
    }

    res.json(result);
  });

  // Get reservation by id (debug/admin)
  app.get('/api/reservations/:id', async (req, res) => {
    try {
      const { id } = req.params;
      const { rows } = await (await import('./db')).pool.query('SELECT * FROM reservations WHERE id = $1', [id]);
      res.json(rows[0] || null);
    } catch (err: any) {
      console.error('Get reservation error:', err);
      res.status(500).json({ message: err?.message || 'Failed to read reservation' });
    }
  });

  return httpServer;
}