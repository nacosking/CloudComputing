import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertReservationSchema } from "@shared/schema";
import { z } from "zod";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import QRCode from "qrcode";

const s3Client = new S3Client({ region: "us-east-1" });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // Menu Routes
  app.get("/api/categories", async (req, res) => {
    const categories = await storage.getCategories();
    res.json(categories);
  });

  app.get("/api/categories/:id", async (req, res) => {
    const category = await storage.getCategory(Number(req.params.id));
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.json(category);
  });

  app.get("/api/menu-items", async (req, res) => {
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
    const items = await storage.getMenuItems(categoryId);
    res.json(items);
  });

  app.get("/api/menu-items/:id", async (req, res) => {
    const item = await storage.getMenuItem(Number(req.params.id));
    if (!item) return res.status(404).json({ message: 'Menu item not found' });
    res.json(item);
  });

  // Reservation Routes
  app.post("/api/reservations", async (req, res) => {
    try {
      // 1. Validate Input
      const input = insertReservationSchema.parse(req.body);

      // 2. Save Initial Reservation to RDS
      const reservation = await storage.createReservation(input);

      // 3. Generate QR Code as a Buffer
      // We encode the reservation ID so the staff can scan it later
      const qrData = JSON.stringify({ id: reservation.id, name: reservation.name });
      const qrBuffer = await QRCode.toBuffer(qrData);

      // 4. Upload to S3 using User-Specific Folder
      const bucketName = process.env.S3_BUCKET_NAME;
      const s3Key = `users/${req.user?.id || 'guest'}/reservations/${reservation.id}/qr.png`;

      await s3Client.send(new PutObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
        Body: qrBuffer,
        ContentType: "image/png",
      }));

      // 5. Construct URL and Update Reservation in DB
      const qrUrl = `https://${bucketName}.s3.amazonaws.com/${s3Key}`;
      const updatedReservation = await storage.updateReservationQrUrl(reservation.id, qrUrl);

      res.status(201).json(updatedReservation);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("S3/QR Error:", err);
      res.status(500).json({ message: "Failed to process reservation" });
    }
  });

  await seedDatabase();
  return httpServer;
}