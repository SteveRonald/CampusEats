import { pgTable, serial, text, integer, numeric, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";
import { vendorsTable } from "./vendors";

export const orderStatusEnum = pgEnum("order_status", ["pending", "paid", "preparing", "ready", "completed", "cancelled"]);

export const ordersTable = pgTable("orders", {
  id: serial("id").primaryKey(),
  studentId: integer("student_id").references(() => usersTable.id),
  vendorId: integer("vendor_id").notNull().references(() => vendorsTable.id),
  studentName: text("student_name"),
  status: orderStatusEnum("status").notNull().default("paid"),
  totalAmount: numeric("total_amount", { precision: 10, scale: 2 }).notNull(),
  pickupCode: text("pickup_code"),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const insertOrderSchema = createInsertSchema(ordersTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertOrder = z.infer<typeof insertOrderSchema>;
export type Order = typeof ordersTable.$inferSelect;
