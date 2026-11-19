import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getKioskSettings, KioskSettingsSchema, updateKioskSettings } from "@/features/kiosk/settings";

export async function GET() {
  try { return NextResponse.json(await getKioskSettings()); }
  catch { return NextResponse.json({ error: "Failed to load config" }, { status: 500 }); }
}

export async function PATCH(request: Request) {
  try {
    const input = KioskSettingsSchema.parse(await request.json());
    return NextResponse.json(await updateKioskSettings(input, true));
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid kiosk settings", details: error.issues }, { status: 400 });
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  }
}
