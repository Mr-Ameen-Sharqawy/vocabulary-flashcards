export const studentGrades = ["grade4", "grade5", "grade6"] as const;
export type StudentGrade = (typeof studentGrades)[number];

export function normalizeAllowedGrades(value?: string | readonly string[] | null): StudentGrade[] {
  const candidates = Array.isArray(value) ? value : typeof value === "string" ? value.split(",") : [];
  const allowed = studentGrades.filter(grade => candidates.includes(grade));
  return allowed.length > 0 ? allowed : [...studentGrades];
}

export function serializeAllowedGrades(grades: readonly StudentGrade[]) {
  return normalizeAllowedGrades(grades).join(",");
}

export function canAccessGrade(allowedGrades: readonly StudentGrade[], grade: StudentGrade) {
  return allowedGrades.includes(grade);
}

export type TrialDeviceState = "new" | "active" | "locked";

export function trialDeviceState(endsAt: Date | null | undefined, locked: boolean, now = Date.now()): TrialDeviceState {
  if (locked) return "locked";
  if (!endsAt) return "new";
  return endsAt.getTime() > now ? "active" : "locked";
}
