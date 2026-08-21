import { describe, expect, it } from "vitest";
import { canAccessGrade, normalizeAllowedGrades, serializeAllowedGrades, trialDeviceState } from "./studentAccess";

describe("student access rules", () => {
  it("keeps valid assigned grades and safely defaults legacy accounts to both grades", () => {
    expect(normalizeAllowedGrades("grade5,grade4,grade5")).toEqual(["grade4", "grade5"]);
    expect(normalizeAllowedGrades("unexpected")).toEqual(["grade4", "grade5"]);
    expect(serializeAllowedGrades(["grade5"])).toBe("grade5");
    expect(canAccessGrade(["grade5"], "grade4")).toBe(false);
    expect(canAccessGrade(["grade5"], "grade5")).toBe(true);
  });

  it("treats a trial window as independent state for one device", () => {
    const now = Date.now();
    expect(trialDeviceState(null, false, now)).toBe("new");
    expect(trialDeviceState(new Date(now + 60_000), false, now)).toBe("active");
    expect(trialDeviceState(new Date(now - 1), false, now)).toBe("locked");
    expect(trialDeviceState(new Date(now + 60_000), true, now)).toBe("locked");
  });
});
