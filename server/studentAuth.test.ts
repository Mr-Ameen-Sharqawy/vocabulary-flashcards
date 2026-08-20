import { describe, expect, it } from "vitest";
import { hashStudentPassword, verifyStudentPassword } from "./studentAuth";

describe("student password protection", () => {
  it("hashes a password and accepts only the matching secret", async () => {
    const hash = await hashStudentPassword("Bright-Student-2026");

    expect(hash).not.toContain("Bright-Student-2026");
    await expect(verifyStudentPassword("Bright-Student-2026", hash)).resolves.toBe(true);
    await expect(verifyStudentPassword("Wrong-Student-2026", hash)).resolves.toBe(false);
  });
});
