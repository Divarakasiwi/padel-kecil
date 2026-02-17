import { NextResponse } from "next/server";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../../firebase";

const MAX_NAME_LENGTH = 40;

function normalizeName(value) {
  return value.trim().replace(/\s{2,}/g, " ").slice(0, MAX_NAME_LENGTH);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { code, name, phone, photoBase64, photoThumbnail, photoCard } = body;

    const serverCode = String(process.env.REGISTER_CODE || "").trim();
    if (!/^\d{6}$/.test(serverCode)) {
      return NextResponse.json(
        { error: "REGISTER_CODE belum dikonfigurasi dengan benar di server." },
        { status: 500 }
      );
    }

    const clientCode = String(code ?? "").trim();
    const codeValid = /^\d{6}$/.test(clientCode) && clientCode === serverCode;

    if (!codeValid) {
      return NextResponse.json(
        { error: "Kode harus 6 digit dan benar." },
        { status: 400 }
      );
    }

    const normalizedName = normalizeName(name || "");
    if (!normalizedName) {
      return NextResponse.json(
        { error: "Nama wajib diisi." },
        { status: 400 }
      );
    }
    if (normalizedName.length > MAX_NAME_LENGTH) {
      return NextResponse.json(
        { error: `Nama maksimal ${MAX_NAME_LENGTH} huruf.` },
        { status: 400 }
      );
    }

    const digitsOnly = String(phone || "").replace(/\D/g, "");
    if (digitsOnly.length < 10 || digitsOnly.length > 12) {
      return NextResponse.json(
        { error: "Nomor HP harus 10–12 digit." },
        { status: 400 }
      );
    }

    let photoUrl = "";
    let finalThumbnail = photoThumbnail || "";
    let finalCard = photoCard || "";

    if (photoBase64 && typeof photoBase64 === "string") {
      const base64Data = photoBase64.replace(/^data:image\/\w+;base64,/, "");
      const buffer = Buffer.from(base64Data, "base64");
      const storageRef = ref(
        storage,
        `players/${Date.now()}_register.jpg`
      );
      await uploadBytes(storageRef, new Uint8Array(buffer));
      photoUrl = await getDownloadURL(storageRef);
    }

    const docRef = await addDoc(collection(db, "players"), {
      name: normalizedName,
      phone: digitsOnly,
      photoUrl,
      photoThumbnail: finalThumbnail,
      photoCard: finalCard,
      badge: null,
      isVIP: false,
      status: "active",
      createdAt: serverTimestamp(),
    });

    const playerId = docRef.id;
    return NextResponse.json({
      success: true,
      playerId,
      player: {
        id: playerId,
        name: normalizedName,
        photoUrl,
        photoThumbnail: finalThumbnail,
        photoCard: finalCard,
        badge: null,
        isVIP: false,
      },
    });
  } catch (e) {
    console.error("[api/register]", e);
    return NextResponse.json(
      { error: "Terjadi kesalahan saat menyimpan data. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
