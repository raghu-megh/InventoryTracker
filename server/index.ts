import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import dotenv from "dotenv";
import session from "express-session";

// Load environment variables from .env file in development
if (process.env.NODE_ENV === "development") {
  dotenv.config();
}

// Set Azure Document Intelligence API key
process.env.AZURE_DOCUMENT_AI_KEY =
  process.env.AZURE_DOCUMENT_AI_KEY ||
  "16TFeGA8wsKcc49KyGe4uT7YrchqjToHh4mU0Cl5WsoStF1YGl9xJQQJ99BCAC4f1cMXJ3w3AAALACOGKJMX";

// Set Clover OAuth credentials
process.env.CLOVER_APP_ID = process.env.CLOVER_APP_ID || "PEXCEC6HVVG0Y";
process.env.CLOVER_APP_SECRET =
  process.env.CLOVER_APP_SECRET || "49d2701d-bab2-1010-901c-7dc0d1e934b8";

const app = express();

app.use(
  session({
    secret: process.env.SESSION_SECRET!, // ➔ set this in your env
    resave: false, // don’t save unmodified sessions
    saveUninitialized: true, // create session on first use
    cookie: {
      secure: false, // true if you use HTTPS in prod
      maxAge: 24 * 60 * 60 * 1000, // e.g. 1 day
    },
  }),
);

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

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Get host and port from environment variables with defaults
  const host = process.env.HOST || "0.0.0.0";
  const port = parseInt(process.env.PORT || "5000", 10);

  server.listen(
    {
      port,
      host,
      reusePort: true,
    },
    () => {
      log(`serving on ${host}:${port}`);
    },
  );
})();
