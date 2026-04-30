import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import { pool, query } from "../db/client.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "7d";

function createToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function createPublicId(userId) {
  const secret = JWT_SECRET || "campuseats";
  const digest = crypto.createHmac("sha256", secret).update(String(userId)).digest("hex");
  return `usr_${digest.slice(0, 16)}`;
}

function toProfile(row) {
  return {
    role: row.role,
    userId: row.id,
    publicId: createPublicId(row.id),
    vendorId: row.vendor_id ?? undefined,
    name: row.name,
    email: row.email,
    phone: row.phone ?? null
  };
}

async function getUserByEmail(email) {
  const result = await query(
    `SELECT u.id, u.name, u.email, u.phone, u.password_hash, u.role, v.id AS vendor_id
     FROM users u
     LEFT JOIN vendors v ON v.user_id = u.id
     WHERE LOWER(u.email) = LOWER($1)
     LIMIT 1`,
    [email]
  );

  return result.rows[0] ?? null;
}

async function isPasswordValid(password, passwordHash) {
  if (!passwordHash) return false;

  try {
    return await bcrypt.compare(password, passwordHash);
  } catch (_error) {
    return password === passwordHash;
  }
}

export async function register(req, res) {
  const client = await pool.connect();

  try {
    const {
      role,
      name,
      email,
      phone,
      password,
      stallName,
      description,
      mpesaNumber,
      imageUrl,
      location,
      pickupTimeMin,
      pickupTimeMax
    } = req.body;

    if (!["student", "vendor"].includes(role)) {
      return res.status(400).json({ error: "Role must be student or vendor" });
    }

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }

    if (role === "vendor" && (!stallName || !mpesaNumber)) {
      return res.status(400).json({ error: "Vendors must provide stall name and M-Pesa number" });
    }

    await client.query("BEGIN");

    const existing = await client.query(`SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`, [email]);
    if (existing.rows.length) {
      await client.query("ROLLBACK");
      return res.status(409).json({ error: "Email is already registered" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userResult = await client.query(
      `INSERT INTO users (name, email, phone, password_hash, role)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role`,
      [name, email, phone || null, passwordHash, role]
    );

    const user = userResult.rows[0];
    let vendorId;

    if (role === "vendor") {
      const vendorResult = await client.query(
        `INSERT INTO vendors (user_id, stall_name, description, mpesa_number, image_url, location, pickup_time_min, pickup_time_max, verification_status, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', false)
         RETURNING id`,
        [
          user.id,
          stallName,
          description || null,
          mpesaNumber,
          imageUrl || null,
          location || null,
          Number(pickupTimeMin) || 10,
          Number(pickupTimeMax) || 15
        ]
      );
      vendorId = vendorResult.rows[0].id;
    }

    await client.query("COMMIT");

    const profile = {
      role: user.role,
      userId: user.id,
      publicId: createPublicId(user.id),
      vendorId,
      name: user.name,
      email: user.email,
      phone: phone || null
    };
    const token = createToken({ id: user.id, role: user.role, vendorId });

    return res.status(201).json({ token, profile });
  } catch (error) {
    await client.query("ROLLBACK");
    return res.status(500).json({ error: "Registration failed" });
  } finally {
    client.release();
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await getUserByEmail(email);
    if (!user || !(await isPasswordValid(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (user.role === "admin") {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const profile = toProfile(user);
    const token = createToken({ id: user.id, role: user.role, vendorId: user.vendor_id ?? undefined });
    return res.json({ token, profile });
  } catch (error) {
    return res.status(500).json({ error: "Login failed" });
  }
}

export async function adminLogin(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await getUserByEmail(email);
    if (!user || user.role !== "admin" || !(await isPasswordValid(password, user.password_hash))) {
      return res.status(401).json({ error: "Invalid admin credentials" });
    }

    const profile = toProfile(user);
    const token = createToken({ id: user.id, role: user.role, vendorId: user.vendor_id ?? undefined });
    return res.json({ token, profile });
  } catch (error) {
    return res.status(500).json({ error: "Admin login failed" });
  }
}

export async function forgotPassword(req, res) {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ error: "Email and new password are required" });
    }

    if (String(newPassword).length < 6) {
      return res.status(400).json({ error: "New password must be at least 6 characters" });
    }

    const existing = await query(`SELECT id FROM users WHERE LOWER(email) = LOWER($1) LIMIT 1`, [email]);
    if (!existing.rows.length) {
      return res.status(404).json({ error: "Email not found" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await query(`UPDATE users SET password_hash = $2 WHERE id = $1`, [existing.rows[0].id, passwordHash]);

    return res.json({ success: true, message: "Password reset successful" });
  } catch (error) {
    return res.status(500).json({ error: "Failed to reset password" });
  }
}

export async function updateProfile(req, res) {
  try {
    const { name, email, phone } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: "Name and email are required" });
    }

    const duplicate = await query(
      `SELECT id FROM users WHERE LOWER(email) = LOWER($1) AND id <> $2 LIMIT 1`,
      [email, req.user.id]
    );
    if (duplicate.rows.length) {
      return res.status(409).json({ error: "Email is already in use" });
    }

    const result = await query(
      `UPDATE users
       SET name = $2, email = $3, phone = $4
       WHERE id = $1
       RETURNING id, name, email, phone, role`,
      [req.user.id, String(name).trim(), String(email).trim(), phone ? String(phone).trim() : null]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    const vendor = await query(`SELECT id FROM vendors WHERE user_id = $1 LIMIT 1`, [req.user.id]);
    const row = { ...result.rows[0], vendor_id: vendor.rows[0]?.id ?? null };

    return res.json({ profile: toProfile(row) });
  } catch (error) {
    return res.status(500).json({ error: "Failed to update profile" });
  }
}

export async function me(req, res) {
  try {
    const result = await query(
      `SELECT u.id, u.name, u.email, u.phone, u.role, v.id AS vendor_id
       FROM users u
       LEFT JOIN vendors v ON v.user_id = u.id
       WHERE u.id = $1
       LIMIT 1`,
      [req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ profile: toProfile(result.rows[0]) });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch session profile" });
  }
}
