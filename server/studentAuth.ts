import { promisify } from "node:util";
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { parse } from "cookie";
import type { Request, Response } from "express";
import { getSessionCookieOptions } from "./_core/cookies";
import { ENV } from "./_core/env";
import { getStudentById } from "./db";

const scrypt = promisify(scryptCallback);
export const STUDENT_SESSION_COOKIE = "student_session";
const sessionMaxAgeSeconds = 60 * 60 * 24 * 7;

function sessionKey() {
  if (!ENV.cookieSecret) throw new Error("Session secret is not configured");
  return new TextEncoder().encode(ENV.cookieSecret);
}

export async function hashStudentPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `${salt}:${derived.toString("hex")}`;
}

export async function verifyStudentPassword(password: string, storedHash: string) {
  const [salt, expected] = storedHash.split(":");
  if (!salt || !expected) return false;
  const actual = (await scrypt(password, salt, 64)) as Buffer;
  const expectedBuffer = Buffer.from(expected, "hex");
  return expectedBuffer.length === actual.length && timingSafeEqual(expectedBuffer, actual);
}

async function signStudentSession(studentId: number, sessionVersion: number) {
  return new SignJWT({ role: "student", sessionVersion })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(studentId))
    .setIssuedAt()
    .setExpirationTime(`${sessionMaxAgeSeconds}s`)
    .sign(sessionKey());
}

export async function setStudentSession(res: Response, req: Request, studentId: number, sessionVersion: number) {
  const token = await signStudentSession(studentId, sessionVersion);
  res.cookie(STUDENT_SESSION_COOKIE, token, {
    ...getSessionCookieOptions(req),
    maxAge: sessionMaxAgeSeconds * 1000,
  });
}

export function clearStudentSession(res: Response, req: Request) {
  res.clearCookie(STUDENT_SESSION_COOKIE, { ...getSessionCookieOptions(req), maxAge: -1 });
}

export async function getStudentSession(req: Request) {
  const token = parse(req.headers.cookie ?? "")[STUDENT_SESSION_COOKIE];
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, sessionKey());
    if (payload.role !== "student" || !payload.sub || typeof payload.sessionVersion !== "number") return null;
    const student = await getStudentById(Number(payload.sub));
    if (!student || !student.enabled || student.sessionVersion !== payload.sessionVersion) return null;
    return student;
  } catch {
    return null;
  }
}
