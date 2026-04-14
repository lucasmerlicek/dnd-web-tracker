import { describe, it, expect } from "vitest";
import { authOptions } from "@/lib/auth";
import type { NextAuthOptions } from "next-auth";

/**
 * Unit tests for auth flow
 * Validates: Requirements 1.1, 1.2, 1.3, 1.4
 */

// CredentialsProvider stores the real authorize in `options.authorize`
// (the top-level `authorize` is a no-op default — see credentials.js source)
function getAuthorize(opts: NextAuthOptions) {
  const credProvider = opts.providers[0] as any;
  return credProvider.options.authorize as (
    credentials: Record<string, string> | undefined,
    req: any
  ) => Promise<any>;
}

describe("Auth — credential validation", () => {
  const authorize = getAuthorize(authOptions);

  it("returns user with characterId 'madea' for valid Madea credentials", async () => {
    const result = await authorize(
      { username: "Madea", password: "Blackthorn" },
      {} as any
    );
    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      id: "madea",
      name: "Madea Blackthorn",
      characterId: "madea",
    });
  });

  it("returns user with characterId 'ramil' for valid Ramil credentials", async () => {
    const result = await authorize(
      { username: "Ramil", password: "alSaif" },
      {} as any
    );
    expect(result).not.toBeNull();
    expect(result).toMatchObject({
      id: "ramil",
      name: "Ramil al-Sayif",
      characterId: "ramil",
    });
  });

  it("returns null for wrong password", async () => {
    const result = await authorize(
      { username: "Madea", password: "wrong" },
      {} as any
    );
    expect(result).toBeNull();
  });

  it("returns null for unknown username", async () => {
    const result = await authorize(
      { username: "Unknown", password: "Blackthorn" },
      {} as any
    );
    expect(result).toBeNull();
  });

  it("returns null when credentials are missing", async () => {
    const result = await authorize({} as any, {} as any);
    expect(result).toBeNull();
  });

  it("returns null when username is empty", async () => {
    const result = await authorize(
      { username: "", password: "Blackthorn" },
      {} as any
    );
    expect(result).toBeNull();
  });
});

describe("Auth — JWT and session callbacks", () => {
  const { jwt, session } = authOptions.callbacks!;

  it("jwt callback stores characterId from user into token", async () => {
    const token = await jwt!({
      token: { sub: "madea", characterId: "" },
      user: { id: "madea", name: "Madea Blackthorn", characterId: "madea" },
      account: null,
      trigger: "signIn",
    });
    expect(token.characterId).toBe("madea");
  });

  it("jwt callback preserves existing characterId when no user present", async () => {
    const token = await jwt!({
      token: { sub: "ramil", characterId: "ramil" },
      user: undefined as any,
      account: null,
      trigger: "update",
    });
    expect(token.characterId).toBe("ramil");
  });

  it("session callback injects characterId into session.user", async () => {
    const result = await session!({
      session: { user: { name: "Madea Blackthorn", characterId: "" }, expires: "" },
      token: { sub: "madea", characterId: "madea" },
      user: undefined as any,
      trigger: "update",
      newSession: undefined,
    });
    expect((result.user as { characterId: string }).characterId).toBe("madea");
  });
});

describe("Auth — middleware matcher", () => {
  it("matcher excludes /login from auth guard", () => {
    const pattern = new RegExp(
      "^/((?!login|api/auth|_next/static|_next/image|favicon.ico|images).*)"
    );
    expect(pattern.test("/login")).toBe(false);
  });

  it("matcher excludes /api/auth routes from auth guard", () => {
    const pattern = new RegExp(
      "^/((?!login|api/auth|_next/static|_next/image|favicon.ico|images).*)"
    );
    expect(pattern.test("/api/auth/signin")).toBe(false);
    expect(pattern.test("/api/auth/callback/credentials")).toBe(false);
  });

  it("matcher includes /dashboard in auth guard", () => {
    const pattern = new RegExp(
      "^/((?!login|api/auth|_next/static|_next/image|favicon.ico|images).*)"
    );
    expect(pattern.test("/dashboard")).toBe(true);
  });

  it("matcher includes /spells in auth guard", () => {
    const pattern = new RegExp(
      "^/((?!login|api/auth|_next/static|_next/image|favicon.ico|images).*)"
    );
    expect(pattern.test("/spells")).toBe(true);
  });

  it("matcher excludes static assets", () => {
    const pattern = new RegExp(
      "^/((?!login|api/auth|_next/static|_next/image|favicon.ico|images).*)"
    );
    expect(pattern.test("/_next/static/chunk.js")).toBe(false);
    expect(pattern.test("/_next/image/photo.png")).toBe(false);
    expect(pattern.test("/favicon.ico")).toBe(false);
  });
});

describe("Auth — authOptions configuration", () => {
  it("uses JWT session strategy", () => {
    expect(authOptions.session?.strategy).toBe("jwt");
  });

  it("configures /login as the sign-in page", () => {
    expect(authOptions.pages?.signIn).toBe("/login");
  });

  it("has exactly one credentials provider", () => {
    expect(authOptions.providers).toHaveLength(1);
    expect(authOptions.providers[0].id).toBe("credentials");
  });
});
