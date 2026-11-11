import { describe, expect, it } from "vitest";
import { canAccess } from "@/lib/admin-roles";

describe("admin role access", () => {
  it("only admin can manage users", () => {
    expect(canAccess(["admin"], "users")).toBe(true);
    expect(canAccess(["manager"], "users")).toBe(false);
    expect(canAccess(["editor"], "users")).toBe(false);
  });
  it("editor sees only articles", () => {
    expect(canAccess(["editor"], "articles")).toBe(true);
    expect(canAccess(["editor"], "orders")).toBe(false);
    expect(canAccess(["editor"], "pricing")).toBe(false);
  });
  it("manager handles orders, clients, analytics and pricing", () => {
    for (const s of ["orders", "clients", "analytics", "pricing"] as const) expect(canAccess(["manager"], s)).toBe(true);
    expect(canAccess(["manager"], "articles")).toBe(false);
  });
});
