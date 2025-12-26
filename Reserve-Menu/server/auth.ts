import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser { }
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // ✅ CRITICAL: Trust the AWS Load Balancer
  // This ensures Express knows it's secure (HTTPS) even if the internal hop is HTTP
  app.set("trust proxy", 1);

  // Define session length (30 Days)
  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;

  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "r8q/+&1LM3)Cd*zAGpx1xm{NeQHc;#",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      // ✅ LOGIC: If we are in production (AWS), we MUST use secure cookies.
      // Since we trust the proxy, Express will correctly see the HTTPS header from the ALB.
      secure: app.get("env") === "production", 
      httpOnly: true,     // Prevents JS from reading the cookie (XSS protection)
      maxAge: THIRTY_DAYS, // ✅ Keeps user logged in for 30 days
      sameSite: "lax",    // Allows the cookie to be sent on top-level navigations
    }
  };

  console.log("🔐 Session config loaded:", {
    env: app.get("env"),
    secure: sessionSettings.cookie?.secure,
    maxAgeDays: (sessionSettings.cookie?.maxAge || 0) / (24 * 60 * 60 * 1000),
    trustProxy: app.get("trust proxy")
  });

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // ... (Rest of your code remains the same) ...

  // ✅ Middleware to log session status (Debugging)
  app.use((req, res, next) => {
    // Only log if session is missing or user is not found, to reduce noise
    if (!req.isAuthenticated()) {
      // console.log("⚠️ Unauthenticated Request:", req.path);
    }
    next();
  });

  // Configure Passport Local Strategy - Login with USERNAME (not email)
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid credentials" });
        } else {
          return done(null, user);
        }
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // ============================================================
  //   AUTHENTICATION ROUTES
  // ============================================================

  // Register endpoint
  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUsername = await storage.getUserByUsername(req.body.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      const hashedPassword = await hashPassword(req.body.password);

      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
        isAdmin: req.body.email === "admin@lumiere.com",
      });

      req.login(user, (err) => {
        if (err) return next(err);
        const { password: _, ...safeUser } = user;
        res.status(201).json(safeUser);
      });
    } catch (err) {
      next(err);
    }
  });

  // Login endpoint
  app.post("/api/login", async (req, res, next) => {
    try {
      const user = await storage.getUserByEmail(req.body.email);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      passport.authenticate("local", (err: any, authenticatedUser: any, info: any) => {
        if (err) return next(err);
        if (!authenticatedUser) {
          return res.status(401).json({ message: info?.message || "Invalid credentials" });
        }

        req.login(authenticatedUser, (err) => {
          if (err) return next(err);
          const { password: _, ...safeUser } = authenticatedUser;
          res.status(200).json(safeUser);
        });
      })({ body: { username: user.username, password: req.body.password } }, res, next);
    } catch (err) {
      next(err);
    }
  });

  // Logout endpoint
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Get current user endpoint
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    const { password: _, ...safeUser } = req.user as SelectUser;
    res.json(safeUser);
  });
}

// Middleware to check if user is authenticated
export function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Not authenticated" });
}

// Middleware to check if user is admin
export function isAdmin(req: any, res: any, next: any) {
  if (req.isAuthenticated() && req.user?.isAdmin) {
    return next();
  }
  res.status(403).json({ message: "Admin access required" });
}