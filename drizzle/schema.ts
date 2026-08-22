import { boolean, int, json, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

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
  maxDevices: int("max_devices").default(1).notNull(),
  allowedGrades: varchar("allowed_grades", { length: 48 }).default("grade4,grade5,grade6").notNull(),
  accessType: mysqlEnum("access_type", ["standard", "trial"]).default("standard").notNull(),
  trialStartedAt: timestamp("trial_started_at"),
  trialEndsAt: timestamp("trial_ends_at"),
  trialLocked: boolean("trial_locked").default(false).notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

/** A device is trusted only after a successful password login for its student account. */
export const studentDevices = mysqlTable("student_devices", {
  id: int("id").autoincrement().primaryKey(),
  studentId: int("student_id").notNull(),
  deviceId: varchar("device_id", { length: 80 }).notNull(),
  deviceLabel: varchar("device_label", { length: 120 }).notNull(),
  trialStartedAt: timestamp("trial_started_at"),
  trialEndsAt: timestamp("trial_ends_at"),
  trialLocked: boolean("trial_locked").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastSeenAt: timestamp("last_seen_at").defaultNow().onUpdateNow().notNull(),
}, table => ({
  studentDeviceUnique: uniqueIndex("student_devices_student_device_unique").on(table.studentId, table.deviceId),
}));

export const studentProgress = mysqlTable("student_progress", {
  studentId: int("student_id").primaryKey(),
  selectedLessonId: varchar("selected_lesson_id", { length: 48 }),
  lessonAnswers: json("lesson_answers").$type<Record<string, unknown>>().notNull(),
  quizScores: json("quiz_scores").$type<Record<string, unknown>>().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
});

export type StudentAccount = typeof studentAccounts.$inferSelect;
export type StudentProgress = typeof studentProgress.$inferSelect;
