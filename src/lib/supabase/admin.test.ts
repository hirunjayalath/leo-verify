import { describe, expect, it, vi } from "vitest";
import { ensureAuthUser, inviteOrFindAuthUser } from "@/lib/supabase/admin";

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

describe("inviteOrFindAuthUser", () => {
  it("invites a new Auth user", async () => {
    const admin = {
      createUser: vi.fn(),
      listUsers: vi.fn(),
      updateUserById: vi.fn(),
      inviteUserByEmail: vi.fn().mockResolvedValue({
        data: { user: { id: "auth-3", email: "new@test.local" } },
        error: null,
      }),
    };

    await expect(inviteOrFindAuthUser("New@test.local", admin)).resolves.toEqual({
      id: "auth-3",
      email: "new@test.local",
      invited: true,
    });
    expect(admin.listUsers).not.toHaveBeenCalled();
  });

  it("finds an already registered Auth user without inviting again", async () => {
    const admin = {
      createUser: vi.fn(),
      listUsers: vi.fn().mockResolvedValue({
        data: {
          users: [{ id: "auth-4", email: "existing@test.local" }],
        },
        error: null,
      }),
      updateUserById: vi.fn(),
      inviteUserByEmail: vi.fn().mockResolvedValue({
        data: { user: null },
        error: { message: "A user with this email address has already been registered" },
      }),
    };

    await expect(
      inviteOrFindAuthUser("existing@test.local", admin),
    ).resolves.toEqual({
      id: "auth-4",
      email: "existing@test.local",
      invited: false,
    });
  });
});
