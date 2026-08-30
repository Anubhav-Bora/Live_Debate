import { createHash, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";

export const SESSION_COOKIE = "debate_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14;

const SCRYPT_OPTIONS = { N: 16_384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 } as const;
const KEY_LENGTH = 64;

const publicUserSelect = {
  id: true,
  username: true,
  email: true,
  createdAt: true,
} as const;

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  createdAt: Date;
};

function deriveKey(password: string, salt: Buffer) {
  return new Promise<Buffer>((resolve, reject) => {
    nodeScrypt(password, salt, KEY_LENGTH, SCRYPT_OPTIONS, (error, key) => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string) {
  const salt = randomBytes(16);
  const key = await deriveKey(password, salt);
  return `scrypt$${SCRYPT_OPTIONS.N}$${SCRYPT_OPTIONS.r}$${SCRYPT_OPTIONS.p}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

export async function verifyPassword(password: string, storedHash: string | null | undefined) {
  const parts = storedHash?.split("$") ?? [];
  if (parts.length !== 6 || parts[0] !== "scrypt") {
    // Keep unknown-account attempts computationally expensive to reduce timing leaks.
    await deriveKey(password, Buffer.alloc(16));
    return false;
  }

  const [, nValue, rValue, pValue, saltValue, keyValue] = parts;
  if (
    Number(nValue) !== SCRYPT_OPTIONS.N ||
    Number(rValue) !== SCRYPT_OPTIONS.r ||
    Number(pValue) !== SCRYPT_OPTIONS.p
  ) return false;

  try {
    const expected = Buffer.from(keyValue, "base64url");
    const actual = await deriveKey(password, Buffer.from(saltValue, "base64url"));
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export function hashSessionToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function createSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1_000);

  await prisma.$transaction(async (database) => {
    await database.session.deleteMany({ where: { OR: [{ expiresAt: { lte: new Date() } }, { userId }] } });
    await database.session.create({ data: { tokenHash: hashSessionToken(token), userId, expiresAt } });
  });

  return { token, expiresAt };
}

export async function setSessionCookie(token: string, expiresAt: Date) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
    priority: "high",
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
    priority: "high",
  });
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || token.length > 128) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashSessionToken(token) },
    select: { id: true, expiresAt: true, user: { select: publicUserSelect } },
  });
  if (!session) return null;
  if (session.expiresAt <= new Date()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => undefined);
    return null;
  }
  return session.user;
}

export async function destroyCurrentSession() {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashSessionToken(token) } });
  }
  await clearSessionCookie();
}

export function requestFingerprint(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return (forwarded || request.headers.get("x-real-ip") || "local").slice(0, 64);
}
