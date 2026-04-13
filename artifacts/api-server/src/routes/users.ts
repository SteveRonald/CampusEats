import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import crypto from "crypto";

const router = Router();

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

router.post("/users", async (req, res) => {
  try {
    const { name, email, phone, password, role = "student" } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "name, email, password required" });
    }

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (existing.length > 0) {
      return res.status(409).json({ error: "Email already registered" });
    }

    const [user] = await db
      .insert(usersTable)
      .values({ name, email, phone, password: hashPassword(password), role })
      .returning();

    const { password: _, ...safeUser } = user;
    res.status(201).json({ ...safeUser, createdAt: user.createdAt });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to create user" });
  }
});

router.post("/users/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "email and password required" });
    }

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (!user || user.password !== hashPassword(password)) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const { password: _, ...safeUser } = user;
    const token = crypto.randomBytes(32).toString("hex");

    res.json({
      user: safeUser,
      token,
    });
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to login" });
  }
});

router.get("/users/me", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

    const userId = req.headers["x-user-id"];
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, Number(userId)));
    if (!user) return res.status(404).json({ error: "User not found" });

    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    req.log.error(err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

export default router;
