import { pgTable, serial, text, integer, boolean, numeric, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { vendorsTable } from "./vendors";

export const menuItemsTable = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  vendorId: integer("vendor_id").notNull().references(() => vendorsTable.id),
  name: text("name").notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  isAvailable: boolean("is_available").notNull().default(true),
  orderCount: integer("order_count").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertMenuItemSchema = createInsertSchema(menuItemsTable).omit({ id: true, createdAt: true, orderCount: true });
export type InsertMenuItem = z.infer<typeof insertMenuItemSchema>;
export type MenuItem = typeof menuItemsTable.$inferSelect;
