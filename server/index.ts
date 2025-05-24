import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import bcrypt from 'bcryptjs';
import { storage } from './storage';

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

// ✅ Health check route
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    env: process.env.NODE_ENV || "not set",
    time: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

async function createDefaultUsers() {
  console.log('Checking and creating default users...');

  const defaultUsers = [
    {
      firstName: 'Admin',
      lastName: 'User',
      email: process.env.ADMIN_EMAIL || 'admin@example.com',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      role: process.env.ADMIN_ROLE || 'admin',
      employeeId: 'ADMIN01'
    },
    {
      firstName: 'HR',
      lastName: 'Manager',
      email: process.env.HR_EMAIL || 'hr@example.com',
      password: process.env.HR_PASSWORD || 'hr1234',
      role: process.env.HR_ROLE || 'hr',
      employeeId: 'HR002'
    },
    {
      firstName: 'View',
      lastName: 'Only',
      email: process.env.VIEWER_EMAIL || 'viewer@example.com',
      password: process.env.VIEWER_PASSWORD || 'view789',
      role: process.env.VIEWER_ROLE || 'viewer',
      employeeId: 'VIEW003'
    }
  ];

  for (const user of defaultUsers) {
    try {
      const existingUser = await storage.getUserByEmail(user.email);
      if (existingUser) {
        console.log(`User ${user.email} already exists with role ${existingUser.role}`);
        continue;
      }

      const hashedPassword = await bcrypt.hash(user.password, 10);
      const newUser = await storage.createUser({
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: hashedPassword,
        role: user.role,
        employeeId: user.employeeId,
        isActive: true,
        permissions: {}
      });

      console.log(`Created default user: ${newUser.email} with role: ${newUser.role}`);
    } catch (error) {
      console.error(`Failed to create user ${user.email}:`, error);
    }
  }
}

(async () => {
  await createDefaultUsers();

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Optional: Keep default root endpoint
  app.get("/", (_req, res) => {
    res.status(200).json({ status: "healthy" });
  });

  const port = process.env.PORT || 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
