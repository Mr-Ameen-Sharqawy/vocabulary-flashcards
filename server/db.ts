import { eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, studentAccounts, studentProgress, users } from "../drizzle/schema";
import { ENV } from './_core/env';

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

export type StudentProgressPayload = {
  selectedLessonId?: string;
  lessonAnswers: Record<string, Record<string, string>>;
  quizScores: Record<string, number>;
};

const emptyProgress = (): StudentProgressPayload => ({ lessonAnswers: {}, quizScores: {} });

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

export async function createStudentAccount(input: { displayName: string; username: string; passwordHash: string }) {
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
  return db.select({
    id: studentAccounts.id,
    displayName: studentAccounts.displayName,
    username: studentAccounts.username,
    enabled: studentAccounts.enabled,
    createdAt: studentAccounts.createdAt,
    progressUpdatedAt: studentProgress.updatedAt,
  }).from(studentAccounts).leftJoin(studentProgress, eq(studentProgress.studentId, studentAccounts.id));
}

export async function updateStudentPassword(id: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.update(studentAccounts).set({ passwordHash, sessionVersion: sql`${studentAccounts.sessionVersion} + 1` }).where(eq(studentAccounts.id, id));
}

export async function getStudentProgress(studentId: number): Promise<StudentProgressPayload> {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  const result = await db.select().from(studentProgress).where(eq(studentProgress.studentId, studentId)).limit(1);
  const progress = result[0];
  if (!progress) return emptyProgress();
  return {
    selectedLessonId: progress.selectedLessonId ?? undefined,
    lessonAnswers: progress.lessonAnswers ?? {},
    quizScores: progress.quizScores ?? {},
  };
}

export async function saveStudentProgress(studentId: number, progress: StudentProgressPayload) {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  await db.insert(studentProgress).values({
    studentId,
    selectedLessonId: progress.selectedLessonId ?? null,
    lessonAnswers: progress.lessonAnswers,
    quizScores: progress.quizScores,
  }).onDuplicateKeyUpdate({
    set: {
      selectedLessonId: progress.selectedLessonId ?? null,
      lessonAnswers: progress.lessonAnswers,
      quizScores: progress.quizScores,
      updatedAt: new Date(),
    },
  });
}
