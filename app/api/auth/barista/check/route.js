import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyBaristaCookie, getBaristaCookieName } from "../../../../lib/session";

export const runtime = "nodejs";

export async function GET() {
  const cookieStore = await cookies();
  const value = cookieStore.get(getBaristaCookieName())?.value;
  if (!value || !verifyBaristaCookie(value)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
