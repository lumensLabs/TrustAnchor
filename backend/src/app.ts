import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
import simulationRoutes from "./routes/simulationRoutes.js";
import scoreRoutes from "./routes/scoreRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";
import { globalRateLimiter } from "./middleware/rateLimiter.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { AppError } from "./errors/AppError.js";
import { parseTrustProxy } from "./config/trustProxy.js";
import { getHealth } from "./controllers/healthController.js";

const app = express();

// Configure how many proxy hops to trust so that `req.ip` (and therefore
// per-IP rate limiting) resolves to the real client behind a load balancer /
// reverse proxy instead of the proxy's address. Controlled via the
// `TRUST_PROXY` env var; defaults to not trusting any proxy. Must be set
// before any middleware that relies on `req.ip`.
app.set("trust proxy", parseTrustProxy(process.env.TRUST_PROXY));

const allowedOrigins = process.env.CORS_ALLOWED_ORIGINS
  ? process.env.CORS_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : [];

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  },
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());
app.use(globalRateLimiter);

app.get("/", (req: Request, res: Response) => {
  res.send("RemitLend Backend is running");
});

app.get("/health", getHealth);

app.use("/api", simulationRoutes);
app.use("/api/score", scoreRoutes);
app.use("/api/auth", authRoutes);

app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// ── 404 Catch-All ────────────────────────────────────────────────
// Must be placed after all route definitions so that only truly
// unmatched paths trigger a not-found error.
// Express 5 uses path-to-regexp v8 which requires named params,
// so we use a standard middleware function instead of app.all('*').
app.use((req: Request, _res: Response, next: NextFunction) => {
  next(AppError.notFound(`Cannot ${req.method} ${req.path}`));
});

// ── Global Error Handler ─────────────────────────────────────────
// Must be the LAST middleware registered so it catches every error
// forwarded via next(err) from routes and other middleware.
app.use(errorHandler);

export default app;
