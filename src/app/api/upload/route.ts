import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024;
const TYPES = { png: "image/png", jpg: "image/jpeg", webp: "image/webp" } as const;

function detectImageType(bytes: Buffer): keyof typeof TYPES | null {
  if (bytes.length >= 8 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return "png";
  if (bytes.length >= 3 && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "jpg";
  if (bytes.length >= 12 && bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") return "webp";
  return null;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    if (file.size === 0 || file.size > MAX_FILE_SIZE_BYTES) return NextResponse.json({ error: "Image must be between 1 byte and 2 MB" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const type = detectImageType(buffer);
    if (!type || file.type !== TYPES[type]) return NextResponse.json({ error: "Only valid PNG, JPEG and WebP images are allowed" }, { status: 400 });

    const directory = process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads");
    await mkdir(directory, { recursive: true });
    const filename = `${crypto.randomBytes(16).toString("hex")}.${type}`;
    await writeFile(path.join(directory, filename), buffer, { flag: "wx" });
    return NextResponse.json({ imageUrl: `/api/uploads/${filename}` });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "File upload failed" }, { status: 500 });
  }
}
