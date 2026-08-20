import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { createStudentAccount, getStudentProgress, getStudentByUsername, listStudentAccounts, saveStudentProgress, updateStudentPassword } from "./db";
import { clearStudentSession, getStudentSession, hashStudentPassword, setStudentSession, verifyStudentPassword } from "./studentAuth";

const usernameSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,32}$/);
const passwordSchema = z.string().min(8).max(128);
const progressSchema = z.object({
  selectedLessonId: z.string().max(48).optional(),
  lessonAnswers: z.record(z.string(), z.record(z.string(), z.string())),
  quizScores: z.record(z.string(), z.number().int().min(0).max(5)),
});

function studentView(student: { id: number; displayName: string; username: string }) {
  return { id: student.id, displayName: student.displayName, username: student.username };
}

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  student: router({
    me: publicProcedure.query(async ({ ctx }) => {
      const student = await getStudentSession(ctx.req);
      if (!student) return null;
      return { ...studentView(student), progress: await getStudentProgress(student.id) };
    }),
    login: publicProcedure.input(z.object({ username: usernameSchema, password: passwordSchema })).mutation(async ({ ctx, input }) => {
      const student = await getStudentByUsername(input.username);
      if (!student || !student.enabled || !(await verifyStudentPassword(input.password, student.passwordHash))) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      }
      await setStudentSession(ctx.res, ctx.req, student.id, student.sessionVersion);
      return { ...studentView(student), progress: await getStudentProgress(student.id) };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      clearStudentSession(ctx.res, ctx.req);
      return { success: true };
    }),
    saveProgress: publicProcedure.input(progressSchema).mutation(async ({ ctx, input }) => {
      const student = await getStudentSession(ctx.req);
      if (!student) throw new TRPCError({ code: "UNAUTHORIZED", message: "يرجى تسجيل الدخول كطالب" });
      await saveStudentProgress(student.id, input);
      return { success: true };
    }),
  }),
  students: router({
    list: adminProcedure.query(() => listStudentAccounts()),
    create: adminProcedure.input(z.object({ displayName: z.string().trim().min(2).max(120), username: usernameSchema, password: passwordSchema })).mutation(async ({ input }) => {
      const existing = await getStudentByUsername(input.username);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "اسم المستخدم مستخدم بالفعل" });
      const student = await createStudentAccount({ ...input, passwordHash: await hashStudentPassword(input.password) });
      return studentView(student);
    }),
    resetPassword: adminProcedure.input(z.object({ studentId: z.number().int().positive(), password: passwordSchema })).mutation(async ({ input }) => {
      await updateStudentPassword(input.studentId, await hashStudentPassword(input.password));
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
