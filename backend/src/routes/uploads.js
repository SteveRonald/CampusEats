import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";

const router = Router();

const ALLOWED_CATEGORIES = new Set(["menu-items", "vendor-logos", "vendor-location-proof"]);

function sanitizeFilename(name) {
  return String(name || "image.webp")
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function parseDataUrl(dataUrl) {
  const match = String(dataUrl || "").match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) {
    return null;
  }

  const [, mimeType, base64] = match;
  const buffer = Buffer.from(base64, "base64");
  return { mimeType, buffer };
}

router.post("/image", authenticate, requireRole("vendor", "admin"), async (req, res) => {
  try {
    const supabaseUrl = process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "campuseats-images";

    if (!supabaseUrl || !serviceRoleKey) {
      return res.status(500).json({
        error: "Storage is not configured on backend. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in backend/.env."
      });
    }

    const category = String(req.body.category || "").trim();
    const resourceId = String(req.body.resourceId || "").trim();
    const fileName = sanitizeFilename(req.body.fileName || "image.webp");

    if (!ALLOWED_CATEGORIES.has(category)) {
      return res.status(400).json({ error: "Invalid upload category" });
    }

    if (!/^\d+$/.test(resourceId)) {
      return res.status(400).json({ error: "Invalid resource id" });
    }

    if (req.user.role === "vendor" && Number(resourceId) !== Number(req.user.vendorId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const parsed = parseDataUrl(req.body.dataUrl);
    if (!parsed) {
      return res.status(400).json({ error: "Invalid image payload" });
    }

    const { mimeType, buffer } = parsed;
    if (!mimeType.startsWith("image/")) {
      return res.status(400).json({ error: "Only image uploads are allowed" });
    }

    if (buffer.length > 6 * 1024 * 1024) {
      return res.status(400).json({ error: "Image payload is too large" });
    }

    const timestamp = Date.now();
    const random = Math.random().toString(36).slice(2, 8);
    const path = `${category}/${resourceId}/${timestamp}-${random}-${fileName}`;

    const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${path}`;
    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": mimeType,
        "x-upsert": "true"
      },
      body: buffer
    });

    if (!uploadResponse.ok) {
      const details = await uploadResponse.text().catch(() => "");
      return res.status(502).json({ error: details || "Failed to upload image to storage" });
    }

    const publicUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}/${path}`;
    return res.json({ url: publicUrl, size: buffer.length });
  } catch (_error) {
    return res.status(500).json({ error: "Failed to upload image" });
  }
});

export default router;
