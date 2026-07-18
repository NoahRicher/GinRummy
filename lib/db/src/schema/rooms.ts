import { pgTable, varchar, jsonb, timestamp } from "drizzle-orm/pg-core";

export const roomsTable = pgTable("rooms", {
  code: varchar("code", { length: 8 }).primaryKey(),
  sessionData: jsonb("session_data").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type Room = typeof roomsTable.$inferSelect;
