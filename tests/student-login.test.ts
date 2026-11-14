import { describe, it, expect, vi } from "vitest";
import { signInStudent } from "../lib/student-login";
describe("Student-code migration preserves login", () => {
  it("logs new accounts in directly without extra authentication calls", async () => {
    const success = { error: null, data: { user: { id: "new-user" } } };
    const auth = { signInWithPassword: vi.fn().mockResolvedValue(success) };
    expect(await signInStudent(auth, "2527646", "example-password")).toBe(
      success,
    );
    expect(auth.signInWithPassword).toHaveBeenCalledOnce();
    expect(auth.signInWithPassword).toHaveBeenCalledWith({
      email: "2527646@members.mnagl.invalid",
      password: "example-password",
    });
  });
  it("authenticates the legacy alias with the same password when an existing account needs it", async () => {
    const success = { error: null, data: { user: { id: "existing-user" } } };
    const auth = {
      signInWithPassword: vi
        .fn()
        .mockResolvedValueOnce({ error: { message: "Invalid credentials" } })
        .mockResolvedValueOnce(success),
    };
    expect(await signInStudent(auth, "2527646", "example-password")).toBe(
      success,
    );
    expect(auth.signInWithPassword.mock.calls[1][0]).toEqual({
      email: "25-27-646@members.mnagl.invalid",
      password: "example-password",
    });
  });
  it("does not fall back during signup or treat a failed password check as success", async () => {
    const failure = {
      error: { message: "Invalid credentials" },
      data: { user: null },
    };
    const auth = { signInWithPassword: vi.fn().mockResolvedValue(failure) };
    expect(
      (await signInStudent(auth, "2527646", "incorrect-password")).error,
    ).toBeTruthy();
    expect(auth.signInWithPassword).toHaveBeenCalledTimes(2);
    auth.signInWithPassword.mockClear();
    await signInStudent(auth, "2527646", "incorrect-password", false);
    expect(auth.signInWithPassword).toHaveBeenCalledOnce();
  });
});
