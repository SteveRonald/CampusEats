import { pgTable, serial, integer, numeric, text, timestamp, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { ordersTable } from "./orders";

export const transactionStatusEnum = pgEnum("transaction_status", ["pending", "completed", "failed"]);

export const transactionsTable = pgTable("transactions", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").notNull().references(() => ordersTable.id),
  intasendInvoiceId: text("intasend_invoice_id"),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  commission: numeric("commission", { precision: 10, scale: 2 }).notNull(),
  vendorPayout: numeric("vendor_payout", { precision: 10, scale: 2 }).notNull(),
  status: transactionStatusEnum("status").notNull().default("completed"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const insertTransactionSchema = createInsertSchema(transactionsTable).omit({ id: true, createdAt: true });
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactionsTable.$inferSelect;
