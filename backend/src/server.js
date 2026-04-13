import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import ordersRouter from "./routes/orders.js";
import vendorsRouter from "./routes/vendors.js";
import paymentsRouter from "./routes/payments.js";
import webhookRouter from "./routes/webhook.js";

dotenv.config();

const app = express();

app.use(
  cors({
    origin: process.env.CLIENT_URL ?? "http://localhost:3000"
  })
);
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/orders", ordersRouter);
app.use("/api/vendors", vendorsRouter);
app.use("/api/payments", paymentsRouter);
app.use("/api/webhook", webhookRouter);

const port = Number(process.env.PORT ?? 4000);

app.listen(port, () => {
  console.log(`CampusEats backend running on http://localhost:${port}`);
});
