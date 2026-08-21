import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "../shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { beginTrialAccess, createStudentAccount, getStudentProgress, getStudentByUsername, listStudentAccounts, registerStudentDevice, resetStudentDevices, saveStudentProgress, updateStudentDeviceLimit, updateStudentPassword } from "./db";
import { clearStudentSession, getStudentSession, hashStudentPassword, setStudentSession, verifyStudentPassword } from "./studentAuth";

const usernameSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,32}$/);
const passwordSchema = z.string().min(8).max(128);
const deviceIdSchema = z.string().regex(/^[a-zA-Z0-9_-]{12,80}$/);
const progressSchema = z.object({
  selectedLessonId: z.string().max(48).optional(),
  lessonAnswers: z.record(z.string(), z.record(z.string(), z.string())),
  quizScores: z.record(z.string(), z.number().int().min(0).max(5)),
});

function studentView(student: { id: number; displayName: string; username: string; accessType: "standard" | "trial"; trialEndsAt: Date | null; trialLocked: boolean }, trialEndsAt?: number) {
  return { id: student.id, displayName: student.displayName, username: student.username, isTrial: student.accessType === "trial", trialEndsAt: trialEndsAt ?? student.trialEndsAt?.getTime() ?? null, trialLocked: student.trialLocked };
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
      const session = await getStudentSession(ctx.req);
      if (!session) return null;
      return { ...studentView(session.student), progress: await getStudentProgress(session.student.id) };
    }),
    login: publicProcedure.input(z.object({ username: usernameSchema, password: passwordSchema, deviceId: deviceIdSchema, deviceLabel: z.string().trim().min(2).max(120) })).mutation(async ({ ctx, input }) => {
      const student = await getStudentByUsername(input.username);
      if (!student || !student.enabled || !(await verifyStudentPassword(input.password, student.passwordHash))) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "اسم المستخدم أو كلمة المرور غير صحيحة" });
      }
      if (student.accessType === "trial") {
        const trial = await beginTrialAccess(student.id);
        if (trial.status === "locked") throw new TRPCError({ code: "FORBIDDEN", message: "انتهت تجربة هذا الحساب. تواصل مع المعلم للحصول على نسختك أو حسابك الكامل." });
        const remainingSeconds = Math.max(1, Math.ceil((trial.endsAt - Date.now()) / 1000));
        await setStudentSession(ctx.res, ctx.req, student.id, student.sessionVersion, input.deviceId, remainingSeconds);
        return { ...studentView(student, trial.endsAt), progress: await getStudentProgress(student.id) };
      }
      const device = await registerStudentDevice(student.id, input.deviceId, input.deviceLabel);
      if (!device.allowed) throw new TRPCError({ code: "FORBIDDEN", message: `وصل هذا الحساب إلى الحد الأقصى: ${device.maxDevices} جهاز/أجهزة. اطلب من المعلم إعادة ضبط الأجهزة.` });
      await setStudentSession(ctx.res, ctx.req, student.id, student.sessionVersion, input.deviceId);
      return { ...studentView(student), progress: await getStudentProgress(student.id) };
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      clearStudentSession(ctx.res, ctx.req);
      return { success: true };
    }),
    saveProgress: publicProcedure.input(progressSchema).mutation(async ({ ctx, input }) => {
      const session = await getStudentSession(ctx.req);
      if (!session) throw new TRPCError({ code: "UNAUTHORIZED", message: "يرجى تسجيل الدخول كطالب" });
      await saveStudentProgress(session.student.id, input);
      return { success: true };
    }),
  }),
  students: router({
    list: adminProcedure.query(() => listStudentAccounts()),
    create: adminProcedure.input(z.object({ displayName: z.string().trim().min(2).max(120), username: usernameSchema, password: passwordSchema, maxDevices: z.number().int().min(1).max(10).default(1), accessType: z.enum(["standard", "trial"]).default("standard") })).mutation(async ({ input }) => {
      const existing = await getStudentByUsername(input.username);
      if (existing) throw new TRPCError({ code: "CONFLICT", message: "اسم المستخدم مستخدم بالفعل" });
      const student = await createStudentAccount({ ...input, passwordHash: await hashStudentPassword(input.password) });
      return studentView(student);
    }),
    resetPassword: adminProcedure.input(z.object({ studentId: z.number().int().positive(), password: passwordSchema })).mutation(async ({ input }) => {
      await updateStudentPassword(input.studentId, await hashStudentPassword(input.password));
      return { success: true };
    }),
    updateDeviceLimit: adminProcedure.input(z.object({ studentId: z.number().int().positive(), maxDevices: z.number().int().min(1).max(10) })).mutation(async ({ input }) => {
      await updateStudentDeviceLimit(input.studentId, input.maxDevices);
      return { success: true };
    }),
    resetDevices: adminProcedure.input(z.object({ studentId: z.number().int().positive() })).mutation(async ({ input }) => {
      await resetStudentDevices(input.studentId);
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
