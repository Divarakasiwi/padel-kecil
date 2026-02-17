import { NextResponse } from "next/server";
import {
  createHostCookie,
  getHostCookieName,
} from "../../../lib/session";

export async function POST(request) {
  try {
    const body = await request.json();
    const pin = (body?.pin ?? "").toString().trim();
    const serverPin = process.env.HOST_PIN ?? "";

    if (!serverPin) {
      return NextResponse.json(
        { ok: false, error: "Host PIN tidak dikonfigurasi." },
        { status: 500 }
      );
    }

    if (pin !== serverPin) {
      return NextResponse.json(
        { ok: false, error: "PIN salah. Hanya host yang boleh masuk." },
        { status: 401 }
      );
    }

    const cookieValue = createHostCookie();
    if (!cookieValue) {
      return NextResponse.json(
        { ok: false, error: "Session tidak bisa dibuat." },
        { status: 500 }
      );
    }

    const res = NextResponse.json({ ok: true });
    const name = getHostCookieName();
    res.cookies.set(name, cookieValue, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 12 * 60 * 60,
    });
    return res;
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: "Permintaan tidak valid." },
      { status: 400 }
    );
  }
}
