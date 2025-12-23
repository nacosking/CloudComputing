import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { uploadToS3 } from "./s3";
import { randomUUID } from "crypto";
import { z } from "zod";

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

  // 3. API Route: Create Reservation (persist to S3)
  const reservationSchema = z.object({
    name: z.string().min(1),
    email: z.string().email(),
    date: z.string().min(1),
    time: z.string().min(1),
    guests: z.string().min(1),
  });

  app.post("/api/reservations", async (req, res) => {
    try {
      const parsed = reservationSchema.parse(req.body);

      const bucket = process.env.S3_BUCKET_NAME || "cloud-project-app-storage-382146695720";
      console.log(`Using S3 bucket for reservations: ${bucket}`);

      const id = randomUUID();
      const key = `reservations/${Date.now()}-${id}.json`;
      const payload = { id, ...parsed, createdAt: new Date().toISOString() };

      await uploadToS3(bucket, key, Buffer.from(JSON.stringify(payload), "utf-8"));

      res.status(201).json({ id, url: `s3://${bucket}/${key}` });
    } catch (error: any) {
      console.error("Reservations Route Error:", error);
      const message = error?.message || "Failed to create reservation";
      res.status(400).json({ message });
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

    res.json(result);
  });

  return httpServer;
}