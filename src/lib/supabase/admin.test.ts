import { describe, expect, it, vi } from "vitest";
import { ensureAuthUser } from "@/lib/supabase/admin";

describe("ensureAuthUser", () => {
  it("returns the created user", async () => {
    const admin = {
      createUser: vi.fn().mockResolvedValue({
        data: { user: { id: "auth-1", email: "a@test.local" } },
        error: null,
      }),
      listUsers: vi.fn(),
      updateUserById: vi.fn(),
    };

    await expect(
      ensureAuthUser({ email: "A@test.local", password: "secret12" }, admin),
    ).resolves.toEqual({ id: "auth-1", email: "a@test.local" });
    expect(admin.listUsers).not.toHaveBeenCalled();
  });

  it("links an existing Auth user and confirms email", async () => {
    const admin = {
      createUser: vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: "A user with this email address has already been registered" },
      }),
      listUsers: vi.fn().mockResolvedValue({
        data: {
          users: [{ id: "auth-2", email: "existing@test.local" }],
        },
        error: null,
      }),
      updateUserById: vi.fn().mockResolvedValue({ error: null }),
    };

    await expect(
      ensureAuthUser(
        { email: "existing@test.local", password: "secret12" },
        admin,
      ),
    ).resolves.toEqual({ id: "auth-2", email: "existing@test.local" });
    expect(admin.updateUserById).toHaveBeenCalledWith("auth-2", {
      password: "secret12",
      email_confirm: true,
    });
  });
});
