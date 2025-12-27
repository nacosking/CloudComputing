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
<<<<<<< HEAD
  // ✅ CRITICAL: Trust proxy for AWS ALB
  app.set("trust proxy", 1);

  const sessionSecret = process.env.SESSION_SECRET || "r8q/+&1LM3)Cd*zAGpx1xm{NeQHc;#";

  console.log("🔐 Session Configuration:");
  console.log("  - Session secret configured:", !!process.env.SESSION_SECRET);
  console.log("  - Trust proxy: 1");
=======
  // ✅ CRITICAL: Trust proxy is required for ALB
  app.set("trust proxy", 1);

  const THIRTY_DAYS = 30 * 24 * 60 * 60 * 1000;
  const isProduction = process.env.NODE_ENV === "production";
>>>>>>> master

  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
<<<<<<< HEAD
    store: storage.sessionStore,
    // ✅ CHANGE THIS NAME to something new to bypass old stuck cookies
    name: "lumiere_session_v2",
    cookie: {
      // ✅ Keep secure FALSE for HTTP/AWS ALB
      secure: false,
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      path: "/",
    },
    proxy: true,
  };

=======
    store: storage.sessionStore, // Now using PostgreSQL store
    cookie: {
      secure: false, // ✅ Keep false even behind ALB (ALB terminates HTTPS)
      httpOnly: true,
      maxAge: THIRTY_DAYS,
      sameSite: "lax",
      // ✅ CRITICAL: Don't set domain for ALB, let browser handle it
      path: "/",
    },
    name: "lumiere.sid",
    rolling: true, // ✅ Refresh session on each request
  };

  console.log("🔐 Session config loaded:", {
    env: app.get("env"),
    isProduction,
    secure: sessionSettings.cookie?.secure,
    maxAgeDays: (sessionSettings.cookie?.maxAge || 0) / (24 * 60 * 60 * 1000),
    trustProxy: app.get("trust proxy"),
    store: storage.sessionStore.constructor.name
  });

>>>>>>> master
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

<<<<<<< HEAD
  // ✅ Debug middleware
  app.use((req, res, next) => {
    console.log(`📍 ${req.method} ${req.path}`);
    console.log(`  SessionID: ${req.sessionID}`);
    console.log(`  Cookie header: ${req.headers.cookie || 'NONE'}`);
    console.log(`  Auth: ${req.isAuthenticated()}`);
    if (req.user) console.log(`  User: ${(req.user as any).email}`);
=======
  // ✅ Enhanced logging with session ID
  app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) {
      console.log(`📋 ${req.method} ${req.path}`, {
        auth: req.isAuthenticated(),
        userId: req.user?.id || 'none',
        sessionId: req.sessionID?.slice(0, 8) + '...',
        hasCookie: !!req.headers.cookie
      });
    }
>>>>>>> master
    next();
  });

  passport.use(
<<<<<<< HEAD
    new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
      try {
        console.log("🔍 Login attempt:", email);
        const user = await storage.getUserByEmail(email);

        if (!user) {
          console.log("❌ User not found");
          return done(null, false, { message: "Invalid credentials" });
        }

        const passwordMatch = await comparePasswords(password, user.password);
        if (!passwordMatch) {
          console.log("❌ Password mismatch");
          return done(null, false, { message: "Invalid credentials" });
        }

        console.log("✅ Credentials valid");
        return done(null, user);
      } catch (err) {
        console.error("❌ Login error:", err);
        return done(err);
=======
    new LocalStrategy(
      {
        usernameField: "email",
        passwordField: "password"
      },
      async (email, password, done) => {
        try {
          console.log("🔍 Login attempt for email:", email);
          
          const user = await storage.getUserByEmail(email);

          if (!user) {
            console.log("❌ User not found:", email);
            return done(null, false, { message: "Invalid credentials" });
          }

          console.log("🔍 Found user:", user.email, "Checking password...");
          
          const isValidPassword = await comparePasswords(password, user.password);
          if (!isValidPassword) {
            console.log("❌ Invalid password for:", email);
            return done(null, false, { message: "Invalid credentials" });
          }

          console.log("✅ Password valid! Login successful for:", user.email, "userId:", user.id);
          return done(null, user);
        } catch (err) {
          console.error("❌ Login error:", err);
          return done(err);
        }
>>>>>>> master
      }
    )
  );

  passport.serializeUser((user, done) => {
<<<<<<< HEAD
    console.log("💾 Serialize:", (user as any).id);
=======
    console.log("💾 Serializing user:", user.id);
>>>>>>> master
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
<<<<<<< HEAD
      console.log("🔓 Deserialize:", id);
      const user = await storage.getUser(id);
      if (!user) {
        console.log("❌ User not found");
        return done(null, false);
      }
      console.log("✅ User found:", user.email);
=======
      console.log("🔓 Deserializing user:", id);
      const user = await storage.getUser(id);
      if (!user) {
        console.log("❌ User not found during deserialization:", id);
        return done(null, false);
      }
      console.log("✅ User deserialized:", user.email);
>>>>>>> master
      done(null, user);
    } catch (err) {
      console.error("❌ Deserialization error:", err);
      done(err);
    }
  });

  // ============================================================
  //   AUTH ROUTES
  // ============================================================

  app.post("/api/register", async (req, res, next) => {
    try {
<<<<<<< HEAD
      console.log("📝 Register:", req.body.email);

      const existingUser = await storage.getUserByEmail(req.body.email);
      if (existingUser) {
        console.log("❌ Email exists");
=======
      console.log("📝 Registration attempt:", req.body.email);

      const existingUsername = await storage.getUserByUsername(req.body.username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const existingEmail = await storage.getUserByEmail(req.body.email);
      if (existingEmail) {
>>>>>>> master
        return res.status(400).json({ message: "Email already exists" });
      }

      const hashedPassword = await hashPassword(req.body.password);
<<<<<<< HEAD
=======

>>>>>>> master
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
        isAdmin: req.body.email === "admin@lumiere.com",
      });

<<<<<<< HEAD
      console.log("✅ User created");

      req.login(user, (err) => {
        if (err) {
          console.error("❌ Login failed:", err);
          return next(err);
        }

=======
      console.log("✅ User registered:", user.email, "userId:", user.id);

      req.login(user, (err) => {
        if (err) {
          console.error("❌ Auto-login error:", err);
          return next(err);
        }
        
>>>>>>> master
        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("❌ Session save error:", saveErr);
            return next(saveErr);
          }
<<<<<<< HEAD

          const { password: _, ...safeUser } = user;
          console.log("✅ Registered, SessionID:", req.sessionID);
          console.log("✅ Cookie will be: lumiere.sid");
=======
          
          console.log("✅ Auto-login successful for:", user.email, "Session:", req.sessionID);
          const { password: _, ...safeUser } = user;
>>>>>>> master
          res.status(201).json(safeUser);
        });
      });
    } catch (err) {
      console.error("❌ Registration error:", err);
      next(err);
    }
  });

  app.post("/api/login", (req, res, next) => {
<<<<<<< HEAD
    console.log("🔐 Login request:", req.body.email);
    console.log("   Incoming cookies:", req.headers.cookie);

    passport.authenticate("local", (err: any, user: SelectUser, info: any) => {
      if (err) {
        console.error("❌ Auth error:", err);
=======
    console.log("🔐 Login request for:", req.body.email);

    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("❌ Authentication error:", err);
>>>>>>> master
        return next(err);
      }

      if (!user) {
<<<<<<< HEAD
        console.log("❌ Auth failed:", info?.message);
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }

      req.login(user, (err) => {
        if (err) {
          console.error("❌ Session create failed:", err);
          return next(err);
=======
        console.log("❌ Authentication failed:", info?.message);
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }

      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("❌ Session creation error:", loginErr);
          return next(loginErr);
>>>>>>> master
        }

        req.session.save((saveErr) => {
          if (saveErr) {
            console.error("❌ Session save error:", saveErr);
            return next(saveErr);
          }

<<<<<<< HEAD
          const { password: _, ...safeUser } = user;
          console.log("✅ Login success!");
          console.log("   SessionID:", req.sessionID);
          console.log("   User:", safeUser.email);
          console.log("   Set-Cookie header:", res.getHeader('Set-Cookie'));
          res.json(safeUser);
=======
          console.log("✅ Login successful:", user.email, "Session ID:", req.sessionID);
          const { password: _, ...safeUser } = user;
          
          // ✅ Set cookie explicitly in response header
          res.setHeader('Set-Cookie', `lumiere.sid=${req.sessionID}; Path=/; HttpOnly; Max-Age=${THIRTY_DAYS / 1000}; SameSite=Lax`);
          
          res.status(200).json(safeUser);
>>>>>>> master
        });
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
<<<<<<< HEAD
    const userEmail = req.user ? (req.user as any).email : "unknown";
    console.log("👋 Logout:", userEmail);
=======
    const userEmail = req.user?.email || "unknown";
    console.log("👋 Logout request from:", userEmail);
>>>>>>> master

    req.logout((err) => {
      if (err) {
        console.error("❌ Logout error:", err);
        return next(err);
      }

<<<<<<< HEAD
      req.session.destroy((destroyErr) => {
        if (destroyErr) {
          console.error("❌ Session destroy error:", destroyErr);
        }
        res.clearCookie("lumiere.sid");
        console.log("✅ Logged out");
=======
      req.session.destroy((err) => {
        if (err) {
          console.error("❌ Session destroy error:", err);
        }
        res.clearCookie("lumiere.sid");
        console.log("✅ Logout successful");
>>>>>>> master
        res.sendStatus(200);
      });
    });
  });

  app.get("/api/user", (req, res) => {
<<<<<<< HEAD
    console.log("👤 User check");
    console.log("   SessionID:", req.sessionID);
    console.log("   Cookie:", req.headers.cookie);
    console.log("   Authenticated:", req.isAuthenticated());
=======
    console.log("👤 User check", {
      auth: req.isAuthenticated(),
      userId: req.user?.id || 'none',
      sessionId: req.sessionID?.slice(0, 8) + '...',
      hasCookie: !!req.headers.cookie
    });
>>>>>>> master

    if (!req.isAuthenticated()) {
      console.log("❌ Not authenticated");
      return res.sendStatus(401);
    }
<<<<<<< HEAD

=======
>>>>>>> master
    const { password: _, ...safeUser } = req.user as SelectUser;
    console.log("✅ User:", safeUser.email);
    res.json(safeUser);
  });
<<<<<<< HEAD
=======
}

export function isAuthenticated(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Not authenticated" });
}

export function isAdmin(req: any, res: any, next: any) {
  if (req.isAuthenticated() && req.user?.isAdmin) {
    return next();
  }
  res.status(403).json({ message: "Admin access required" });
>>>>>>> master
}