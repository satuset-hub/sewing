import { describe, expect, it } from "vitest";
import { resolvePostLoginPath } from "@/lib/auth-routing";

describe("resolvePostLoginPath", () => {
  it("sends an admin to the admin dashboard by default", () => {
    expect(resolvePostLoginPath("admin")).toBe("/admin");
  });

  it("sends a member to the member dashboard by default", () => {
    expect(resolvePostLoginPath("member")).toBe("/member");
  });

  it("keeps a valid admin destination for an admin", () => {
    expect(resolvePostLoginPath("admin", "/admin/kalender")).toBe("/admin/kalender");
  });

  it("does not allow a member destination inside the admin area", () => {
    expect(resolvePostLoginPath("member", "/admin/pengaturan")).toBe("/member?error=forbidden");
  });

  it("rejects protocol-relative and backslash-based destinations", () => {
    expect(resolvePostLoginPath("admin", "//example.com")).toBe("/admin");
    expect(resolvePostLoginPath("admin", "/\\example.com")).toBe("/admin");
  });
});
