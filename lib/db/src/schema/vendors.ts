import { pgTable, serial, text, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { usersTable } from "./users";

export const vendorsTable = pgTable("vendors", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => usersTable.id),
  stallName: text("stall_name").notNull(),
  description: text("description"),
  mpesaNumber: text("mpesa_number").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  imageUrl: text("image_url"),
  location: text("location"),
  pickupTimeMin: integer("pickup_time_min").default(10),
  pickupTimeMax: integer("pickup_time_max").default(15),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertVendorSchema = createInsertSchema(vendorsTable).omit({ id: true, createdAt: true });
export type InsertVendor = z.infer<typeof insertVendorSchema>;
export type Vendor = typeof vendorsTable.$inferSelect;
