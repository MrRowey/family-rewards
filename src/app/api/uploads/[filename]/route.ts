import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";

const CONTENT_TYPES: Record<string, string> = { png: "image/png", jpg: "image/jpeg", webp: "image/webp", jpeg: "image/jpeg" };

export async function GET(_request: Request, { params }: { params: Promise<{ filename: string }> }) {
  const { filename } = await params;
  if (!/^[a-f0-9]{32}\.(png|jpg|jpeg|webp)$/.test(filename)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const extension = filename.split(".").at(-1) || "";
  try {
    const directory = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
    // Uploads live in a runtime-mounted volume; do not trace its dynamic path into the standalone bundle.
    const bytes = await readFile(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ directory, filename));
    return new NextResponse(new Uint8Array(bytes), {
      headers: { "Content-Type": CONTENT_TYPES[extension], "X-Content-Type-Options": "nosniff", "Cache-Control": "public, max-age=31536000, immutable" },
    });
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
}
