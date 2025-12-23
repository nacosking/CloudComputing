const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bodyParser = require("body-parser");
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// 1. Create Database Connection Pool
const pool = mysql.createPool({
  host: process.env.DB_HOST,       // We will set this in Terraform later
  user: process.env.DB_USER,       // We will set this in Terraform later
  password: process.env.DB_PASSWORD, // We will set this in Terraform later
  database: 'cloud_project',       // The DB name we just created
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test the connection when app starts
pool.getConnection((err, connection) => {
  if (err) {
    console.error('❌ Database connection failed:', err.code);
  } else {
    console.log('✅ Connected to RDS Database!');
    connection.release();
  }
});

// 2. Reservation Route (Saves to RDS instead of S3)
app.post("/api/reserve", (req, res) => {
  const { full_name, email, date, time, guests } = req.body;

  // Validation
  if (!full_name || !email || !date || !time || !guests) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // SQL Insert Query
  const query = "INSERT INTO bookings (full_name, email, date, time, guests) VALUES (?, ?, ?, ?, ?)";

  pool.query(query, [full_name, email, date, time, guests], (err, result) => {
    if (err) {
      console.error("❌ Error saving to DB:", err);
      return res.status(500).json({ message: "Database error" });
    }

    console.log("🎉 Reservation Saved! ID:", result.insertId);
    res.status(200).json({
      message: "Reservation successful!",
      id: result.insertId
    });
  });
});

// Health Check
app.get("/", (req, res) => {
  res.send("Cloud Project API is Running (RDS Version)");
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});