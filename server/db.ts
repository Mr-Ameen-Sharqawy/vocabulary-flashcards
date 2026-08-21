import { and, count, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, studentAccounts, studentDevices, studentProgress, users } from "../drizzle/schema";
import { ENV } from './_core/env';
import { emptyStudentProgress, progressColumns, readStudentProgress, type StudentProgressPayload } from './studentProgress';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getStudentByUsername(username: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const result = await db.select().from(studentAccounts).where(eq(studentAccounts.username, username)).limit(1);
  return result[0] ?? null;
}

export async function getStudentById(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const result = await db.select().from(studentAccounts).where(eq(studentAccounts.id, id)).limit(1);
  return result[0] ?? null;
}

export async function createStudentAccount(input: { displayName: string; username: string; passwordHash: string; maxDevices: number; accessType: "standard" | "trial" }) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.insert(studentAccounts).values(input);
  const created = await getStudentByUsername(input.username);
  if (!created) throw new Error("Student account was not created");
  return created;
}

export async function listStudentAccounts() {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const accounts = await db.select({
    id: studentAccounts.id,
    displayName: studentAccounts.displayName,
    username: studentAccounts.username,
    enabled: studentAccounts.enabled,
    maxDevices: studentAccounts.maxDevices,
    accessType: studentAccounts.accessType,
    trialEndsAt: studentAccounts.trialEndsAt,
    trialLocked: studentAccounts.trialLocked,
    createdAt: studentAccounts.createdAt,
    progressUpdatedAt: studentProgress.updatedAt,
  }).from(studentAccounts).leftJoin(studentProgress, eq(studentProgress.studentId, studentAccounts.id));
  const deviceCounts = await db.select({ studentId: studentDevices.studentId, total: count() }).from(studentDevices).groupBy(studentDevices.studentId);
  const countByStudent = new Map(deviceCounts.map(row => [row.studentId, Number(row.total)]));
  return accounts.map(account => ({ ...account, deviceCount: countByStudent.get(account.id) ?? 0 }));
}

export async function updateStudentPassword(id: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(studentAccounts).set({ passwordHash, sessionVersion: sql`${studentAccounts.sessionVersion} + 1` }).where(eq(studentAccounts.id, id));
}

export async function updateStudentDeviceLimit(id: number, maxDevices: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(studentAccounts).set({ maxDevices }).where(eq(studentAccounts.id, id));
}

export type DeviceRegistration = { allowed: true } | { allowed: false; maxDevices: number };

export async function registerStudentDevice(studentId: number, deviceId: string, deviceLabel: string): Promise<DeviceRegistration> {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  return db.transaction(async tx => {
    const existing = await tx.select().from(studentDevices).where(and(eq(studentDevices.studentId, studentId), eq(studentDevices.deviceId, deviceId))).limit(1);
    if (existing[0]) {
      await tx.update(studentDevices).set({ lastSeenAt: new Date(), deviceLabel }).where(eq(studentDevices.id, existing[0].id));
      return { allowed: true };
    }
    const account = await tx.select({ maxDevices: studentAccounts.maxDevices }).from(studentAccounts).where(eq(studentAccounts.id, studentId)).limit(1);
    const maxDevices = account[0]?.maxDevices ?? 1;
    const deviceCount = await tx.select({ total: count() }).from(studentDevices).where(eq(studentDevices.studentId, studentId));
    if (Number(deviceCount[0]?.total ?? 0) >= maxDevices) return { allowed: false, maxDevices };
    await tx.insert(studentDevices).values({ studentId, deviceId, deviceLabel });
    return { allowed: true };
  });
}

export async function studentDeviceExists(studentId: number, deviceId: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const result = await db.select({ id: studentDevices.id }).from(studentDevices).where(and(eq(studentDevices.studentId, studentId), eq(studentDevices.deviceId, deviceId))).limit(1);
  return Boolean(result[0]);
}

export async function resetStudentDevices(studentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.transaction(async tx => {
    await tx.delete(studentDevices).where(eq(studentDevices.studentId, studentId));
    await tx.update(studentAccounts).set({ sessionVersion: sql`${studentAccounts.sessionVersion} + 1` }).where(eq(studentAccounts.id, studentId));
  });
}

export type TrialAccess = { status: "active"; endsAt: number } | { status: "locked" };

/** Starts one shared 60-minute trial window; subsequent devices use the same window. */
export async function beginTrialAccess(studentId: number): Promise<TrialAccess> {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  return db.transaction(async tx => {
    const account = await tx.select({ accessType: studentAccounts.accessType, trialLocked: studentAccounts.trialLocked, trialEndsAt: studentAccounts.trialEndsAt }).from(studentAccounts).where(eq(studentAccounts.id, studentId)).limit(1);
    const trial = account[0];
    if (!trial || trial.accessType !== "trial") throw new Error("Trial account is required");
    const now = new Date();
    if (trial.trialLocked || (trial.trialEndsAt && trial.trialEndsAt <= now)) {
      if (!trial.trialLocked) await tx.update(studentAccounts).set({ trialLocked: true, sessionVersion: sql`${studentAccounts.sessionVersion} + 1` }).where(eq(studentAccounts.id, studentId));
      return { status: "locked" };
    }
    if (trial.trialEndsAt) return { status: "active", endsAt: trial.trialEndsAt.getTime() };
    const endsAt = new Date(now.getTime() + 60 * 60 * 1000);
    await tx.update(studentAccounts).set({ trialStartedAt: now, trialEndsAt: endsAt }).where(eq(studentAccounts.id, studentId));
    return { status: "active", endsAt: endsAt.getTime() };
  });
}

export async function isTrialSessionActive(studentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const result = await db.select({ accessType: studentAccounts.accessType, trialLocked: studentAccounts.trialLocked, trialEndsAt: studentAccounts.trialEndsAt }).from(studentAccounts).where(eq(studentAccounts.id, studentId)).limit(1);
  const trial = result[0];
  return trial?.accessType !== "trial" || (!trial.trialLocked && Boolean(trial.trialEndsAt && trial.trialEndsAt > new Date()));
}

export async function getStudentProgress(studentId: number): Promise<StudentProgressPayload> {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const result = await db.select().from(studentProgress).where(eq(studentProgress.studentId, studentId)).limit(1);
  const progress = result[0];
  return readStudentProgress(progress);
}

export async function saveStudentProgress(studentId: number, progress: StudentProgressPayload) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const columns = progressColumns(progress);
  await db.insert(studentProgress).values({
    studentId,
    ...columns,
  }).onDuplicateKeyUpdate({
    set: {
      ...columns,
      updatedAt: new Date(),
    },
  });
}
