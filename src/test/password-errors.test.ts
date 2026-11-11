import { describe, expect, it } from "vitest";
import { classifyPasswordError } from "@/lib/password-errors";

describe("Password update failures", () => {
  it("does not treat a rejected weak password as an expired invitation", () => {
    expect(classifyPasswordError({ code: "weak_password", status: 422 })).toBe("weak");
  });
  it("recognizes the password rejection recorded in the auth logs", () => {
    expect(classifyPasswordError({ message: "Password is known to be weak and easy to guess, please choose a different one.", status: 422 })).toBe("weak");
  });
  it("recognizes an expired session", () => {
    expect(classifyPasswordError({ code: "session_not_found", status: 400 })).toBe("expired");
  });
  it("does not blame an invitation for network failures", () => {
    expect(classifyPasswordError({ message: "Failed to fetch" })).toBe("unknown");
  });
  it("recognizes reuse of the current password", () => {
    expect(classifyPasswordError({ code: "same_password", status: 422 })).toBe("same");
  });
  it("recognizes too many attempts", () => {
    expect(classifyPasswordError({ status: 429 })).toBe("rate-limit");
  });
});