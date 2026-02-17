import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyHostCookie, getHostCookieName } from "../../../../lib/session";

export async function GET() {
  const cookieStore = await cookies();
  const value = cookieStore.get(getHostCookieName())?.value;
  if (!value || !verifyHostCookie(value)) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true });
}
