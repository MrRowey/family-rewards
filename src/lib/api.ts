import { NextResponse } from "next/server";
import { ZodError, type z } from "zod";

export function apiError(error: unknown, fallback: string): NextResponse {
  if (error instanceof ZodError) {
    return NextResponse.json({ error: "Validation failed", details: error.issues }, { status: 400 });
  }
  const message = error instanceof Error ? error.message : "";
  const code = message.split(":")[0];
  const statusByCode: Record<string, number> = {
    NOT_FOUND: 404,
    NOT_ASSIGNED: 400,
    INSUFFICIENT_STARS: 400,
    OUT_OF_STOCK: 400,
    INVALID_STATE: 409,
    CONCURRENCY_ERROR: 409,
  };
  if (Object.hasOwn(statusByCode, code)) {
    return NextResponse.json({ error: message }, { status: statusByCode[code] });
  }
  console.error(fallback, error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function parseJson<T extends z.ZodType>(
  request: Request,
  schema: T,
): Promise<z.output<T>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    throw new ZodError([{ code: "custom", path: [], message: "Invalid JSON body" }]);
  }
  return schema.parse(body);
}
