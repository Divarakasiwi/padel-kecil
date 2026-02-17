import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  verifyBaristaCookie,
  getBaristaCookieName,
} from "../../../lib/session";
import { getTodayKey } from "../../../lib/dashboard";
import { collection, doc, getDoc, getDocs, query, where, addDoc } from "firebase/firestore";
import { db } from "../../../../firebase";

export async function POST(request) {
  try {
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get(getBaristaCookieName())?.value;
    if (!cookieValue || !verifyBaristaCookie(cookieValue)) {
      return NextResponse.json({ ok: false, error: "Sesi barista tidak valid." }, { status: 401 });
    }

    const body = await request.json();
    const playerId = (body?.playerId ?? "").toString().trim();
    if (!playerId) {
      return NextResponse.json({ ok: false, error: "playerId wajib." }, { status: 400 });
    }

    const playerSnap = await getDoc(doc(db, "players", playerId));
    if (!playerSnap.exists()) {
      return NextResponse.json({ ok: false, error: "Pemain tidak ditemukan." }, { status: 404 });
    }
    const playerData = playerSnap.data();
    const today = getTodayKey();

    const matchesSnap = await getDocs(
      query(collection(db, "matches"), where("dayKey", "==", today))
    );
    let playedToday = false;
    matchesSnap.docs.forEach((d) => {
      const data = d.data();
      const t1 = data.team1PlayerIds || [];
      const t2 = data.team2PlayerIds || [];
      if (t1.includes(playerId) || t2.includes(playerId)) playedToday = true;
    });
    if (!playedToday) {
      return NextResponse.json({ ok: false, error: "Belum bermain hari ini." }, { status: 400 });
    }

    const claimsSnap = await getDocs(
      query(
        collection(db, "drinkClaims"),
        where("dayKey", "==", today),
        where("playerId", "==", playerId)
      )
    );
    if (!claimsSnap.empty) {
      return NextResponse.json({ ok: false, error: "Sudah pernah dapat minuman hari ini." }, { status: 400 });
    }

    await addDoc(collection(db, "drinkClaims"), {
      playerId,
      playerName: playerData.name || playerId,
      dayKey: today,
      claimedAt: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      player: {
        name: playerData.name || playerId,
        photoUrl: playerData.photoUrl || "",
        photoThumbnail: playerData.photoThumbnail || "",
      },
    });
  } catch (e) {
    console.error("barista claim error", e);
    return NextResponse.json(
      { ok: false, error: "Koneksi gagal, coba lagi." },
      { status: 500 }
    );
  }
}
