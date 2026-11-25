import { NextResponse } from "next/server";

// Refund execution is deferred to 27.01.0. Do not enable without regression tests.
export async function POST() {
  return NextResponse.json({ error: "Refunds are not available in this release." }, { status: 403 });
}
