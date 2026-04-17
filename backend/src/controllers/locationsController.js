import { query } from "../db/client.js";

async function listRows(table, res) {
  try {
    const result = await query(`SELECT * FROM ${table} ORDER BY name ASC`);
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: `Failed to fetch ${table.replace(/_/g, " ")}` });
  }
}

async function createRow(table, req, res) {
  try {
    const name = String(req.body.name ?? "").trim();
    if (!name) return res.status(400).json({ error: "Name is required" });

    const result = await query(`INSERT INTO ${table} (name, is_active) VALUES ($1, COALESCE($2, TRUE)) RETURNING *`, [name, req.body.isActive]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error?.code === "23505") {
      return res.status(409).json({ error: "Name already exists" });
    }
    res.status(500).json({ error: `Failed to create ${table.replace(/_/g, " ")}` });
  }
}

async function updateRow(table, req, res) {
  try {
    const id = Number(req.params.id);
    const name = String(req.body.name ?? "").trim();
    if (!name) return res.status(400).json({ error: "Name is required" });

    const result = await query(`UPDATE ${table} SET name = $2, is_active = COALESCE($3, is_active) WHERE id = $1 RETURNING *`, [id, name, req.body.isActive]);
    if (!result.rows.length) return res.status(404).json({ error: "Not found" });
    res.json(result.rows[0]);
  } catch (error) {
    if (error?.code === "23505") {
      return res.status(409).json({ error: "Name already exists" });
    }
    res.status(500).json({ error: `Failed to update ${table.replace(/_/g, " ")}` });
  }
}

async function deleteRow(table, req, res) {
  try {
    const id = Number(req.params.id);
    await query(`DELETE FROM ${table} WHERE id = $1`, [id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: `Failed to delete ${table.replace(/_/g, " ")}` });
  }
}

export function listServiceAreas(_req, res) {
  return listRows("service_areas", res);
}

export function listHostels(_req, res) {
  return listRows("hostels", res);
}

export function adminCreateServiceArea(req, res) {
  return createRow("service_areas", req, res);
}

export function adminUpdateServiceArea(req, res) {
  return updateRow("service_areas", req, res);
}

export function adminDeleteServiceArea(req, res) {
  return deleteRow("service_areas", req, res);
}

export function adminCreateHostel(req, res) {
  return createRow("hostels", req, res);
}

export function adminUpdateHostel(req, res) {
  return updateRow("hostels", req, res);
}

export function adminDeleteHostel(req, res) {
  return deleteRow("hostels", req, res);
}