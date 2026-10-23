import { NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB Limit
const ALLOWED_MIME_TYPES = ["image/png", "image/jpeg", "image/webp"];

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json({ error: "File exceeds 2 MB size limit" }, { status: 400 });
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Only PNG, JPEG, and WebP images are allowed" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadDir = path.join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });

    // Generate safe random hex filename
    const fileExtension = file.type.split("/")[1] || "png";
    const safeFilename = `${crypto.randomBytes(16).toString("hex")}.${fileExtension}`;
    const filePath = path.join(uploadDir, safeFilename);

    await writeFile(filePath, buffer);

    return NextResponse.json({ imageUrl: `/uploads/${safeFilename}` });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "File upload failed" }, { status: 500 });
  }
}