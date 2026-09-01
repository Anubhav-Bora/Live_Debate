export const isSafeIdentifier = (value: unknown): value is string =>
  typeof value === "string" && /^[A-Za-z0-9_-]{8,64}$/.test(value);

export async function readJsonObject<T extends Record<string, unknown>>(request: Request): Promise<T | null> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > 32_000) return null;
  try {
    const value = await request.json();
    return value && typeof value === "object" && !Array.isArray(value) ? value as T : null;
  } catch {
    return null;
  }
}
