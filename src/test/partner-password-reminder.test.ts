import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(), partner: vi.fn(), getUserById: vi.fn(), reset: vi.fn(), eq: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    const builder = { middleware: () => builder, validator: () => builder, inputValidator: () => builder, handler: (handler: unknown) => handler };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: {
  auth: { admin: { getUserById: mocks.getUserById }, resetPasswordForEmail: mocks.reset },
} }));
import { sendPartnerPasswordReminder } from "@/lib/users.functions";

const partnerId = "b7b1dc3e-7c70-4078-8193-59825ce01c05";
const accountId = "0c8cd089-2b7d-4599-9d27-584d5b2034b2";
const handler = sendPartnerPasswordReminder as unknown as (input: {
  data: { partnerId: string };
  context: { userId: string; supabase: { rpc: typeof mocks.rpc; from: (table: string) => unknown } };
}) => Promise<{ ok: boolean; email: string }>;
const context = {
  userId: "administrator",
  supabase: { rpc: mocks.rpc, from: () => ({ select: () => ({ eq: mocks.eq }) }) },
};

describe("Administrator sends contractor password reminder", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.rpc.mockResolvedValue({ data: true });
    mocks.eq.mockReturnValue({ maybeSingle: mocks.partner });
    mocks.partner.mockResolvedValue({ data: { user_id: accountId }, error: null });
    mocks.getUserById.mockResolvedValue({ data: { user: { email: "contractor@example.com" } }, error: null });
    mocks.reset.mockResolvedValue({ error: null });
  });
  it("only sends to the auth account of the selected contractor", async () => {
    const result = await handler({ data: { partnerId }, context });
    expect(mocks.eq).toHaveBeenCalledWith("id", partnerId);
    expect(mocks.getUserById).toHaveBeenCalledWith(accountId);
    expect(mocks.reset).toHaveBeenCalledWith("contractor@example.com", { redirectTo: "https://sgo.lt/reset-password" });
    expect(result).toEqual({ ok: true, email: "contractor@example.com" });
  });
  it("denies a caller without the administrator role before accessing the account", async () => {
    mocks.rpc.mockResolvedValue({ data: false });
    await expect(handler({ data: { partnerId }, context })).rejects.toThrow("tik administratoriui");
    expect(mocks.rpc).toHaveBeenCalledWith("has_role", { _user_id: "administrator", _role: "admin" });
    expect(mocks.getUserById).not.toHaveBeenCalled();
    expect(mocks.reset).not.toHaveBeenCalled();
  });
  it("does not send when the selected contractor no longer exists", async () => {
    mocks.partner.mockResolvedValue({ data: null, error: null });
    await expect(handler({ data: { partnerId }, context })).rejects.toThrow("paskyra nerasta");
    expect(mocks.reset).not.toHaveBeenCalled();
  });
  it("reports sending failure instead of claiming the reminder was sent", async () => {
    mocks.reset.mockResolvedValue({ error: { status: 500 } });
    await expect(handler({ data: { partnerId }, context })).rejects.toThrow("Nepavyko išsiųsti");
  });
});