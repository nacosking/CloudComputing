import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import multer from "multer";
import { uploadToS3 } from "./s3";

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

      // Send the file to AWS S3 (using your s3.ts logic)
      const imageUrl = await uploadToS3(req.file);

      // Return the S3 URL to the frontend so it can display the image
      res.json({ url: imageUrl });
    } catch (error) {
      console.error("Upload Route Error:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  // (Optional) Example: Get all users
  // app.get("/api/users", async (req, res) => {
  //   const users = await storage.getUserByUsername("admin");
  //   res.json(users);
  // });

  return httpServer;
}