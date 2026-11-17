import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { getKioskSettings, KioskSettingsSchema, updateKioskSettings } from "@/features/kiosk/settings";

export async function GET() {
  try { return NextResponse.json(await getKioskSettings()); }
  catch { return NextResponse.json({ error: "Failed to load config" }, { status: 500 }); }
}

// Legacy alias for kiosk settings; kept for compatibility.
export async function PATCH(request: Request) {
  try {
    const input = KioskSettingsSchema.parse(await request.json());
    return NextResponse.json(await updateKioskSettings(input, false));
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: "Invalid kiosk settings", details: error.issues }, { status: 400 });
    if (error instanceof Error && error.message === "CONFIG_NOT_INITIALIZED") return NextResponse.json({ error: "Configuration not initialized" }, { status: 400 });
    return NextResponse.json({ error: "Failed to update config" }, { status: 500 });
  }
}
