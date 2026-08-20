import { boolean, int, json, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Student records use teacher-issued usernames and never store plaintext passwords. */
export const studentAccounts = mysqlTable("student_accounts", {
  id: int("id").autoincrement().primaryKey(),
  displayName: varchar("display_name", { length: 120 }).notNull(),
  username: varchar("username", { length: 48 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  sessionVersion: int("session_version").default(1).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export const studentProgress = mysqlTable("student_progress", {
  studentId: int("student_id").primaryKey(),
  selectedLessonId: varchar("selected_lesson_id", { length: 48 }),
  lessonAnswers: json("lesson_answers").$type<Record<string, Record<string, string>>>().notNull(),
  quizScores: json("quiz_scores").$type<Record<string, number>>().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type StudentAccount = typeof studentAccounts.$inferSelect;
export type StudentProgress = typeof studentProgress.$inferSelect;
