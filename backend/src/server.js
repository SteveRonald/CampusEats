import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import ordersRouter from "./routes/orders.js";
import vendorsRouter from "./routes/vendors.js";
import paymentsRouter from "./routes/payments.js";
import webhookRouter from "./routes/webhook.js";
import authRouter from "./routes/auth.js";
import locationsRouter from "./routes/locations.js";
import adminLocationsRouter from "./routes/adminLocations.js";
import { ensureDeliverySchema } from "./db/bootstrap.js";

dotenv.config();

const app = express();

const configuredOrigins = (process.env.CLIENT_URL ?? "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = new Set(["http://localhost:3000", "http://127.0.0.1:3000", ...configuredOrigins]);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin) || process.env.NODE_ENV !== "production") {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    }
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/auth", authRouter);
app.use("/api/locations", locationsRouter);
app.use("/api/admin", adminLocationsRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/vendors", vendorsRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/webhook", webhookRouter);

const port = Number(process.env.PORT ?? 4000);

await ensureDeliverySchema();

app.listen(port, () => {
  console.log(`CampusEats backend running on http://localhost:${port}`);
});
