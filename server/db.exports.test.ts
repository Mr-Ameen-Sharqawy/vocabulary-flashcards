import { describe, expect, it } from "vitest";
import { getTrialDeviceAccess } from "./db";

describe("student database exports", () => {
  it("keeps the trial-device access reader available to student sessions", () => {
    expect(getTrialDeviceAccess).toBeTypeOf("function");
  });
});
