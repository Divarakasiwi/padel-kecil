import { NextResponse } from "next/server";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../../firebase";

export const runtime = "nodejs";

const MAX_NAME_LENGTH = 40;
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024; // 4MB upload asli
const MAX_THUMBNAIL_DATA_URL_LENGTH = 300_000; // batasi payload dataURL kecil
const MAX_CARD_DATA_URL_LENGTH = 700_000; // versi kartu boleh lebih besar dari thumbnail
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 menit
const RATE_LIMIT_MAX = 8; // maks. 8 request/minute per IP
const registerAttempts = new Map();

function normalizeName(value) {
  return value.trim().replace(/\s{2,}/g, " ").slice(0, MAX_NAME_LENGTH);
}

function getClientIp(request) {
  const xff = request.headers.get("x-forwarded-for") || "";
  const first = xff.split(",")[0]?.trim();
  return first || request.headers.get("x-real-ip") || "unknown";
}

function isRateLimited(ip) {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW_MS;

  // bersihkan entry lama agar map tidak membesar terus
  for (const [key, timestamps] of registerAttempts.entries()) {
    const next = timestamps.filter((ts) => ts >= windowStart);
    if (next.length === 0) registerAttempts.delete(key);
    else registerAttempts.set(key, next);
  }

  const timestamps = registerAttempts.get(ip) || [];
  const recent = timestamps.filter((ts) => ts >= windowStart);
  if (recent.length >= RATE_LIMIT_MAX) {
    registerAttempts.set(ip, recent);
    return true;
  }
  recent.push(now);
  registerAttempts.set(ip, recent);
  return false;
}

function validateOptionalDataUrl(value, maxLength) {
  if (!value) return "";
  if (typeof value !== "string") return null;
  if (!/^data:image\/(jpeg|jpg|png|webp);base64,/i.test(value)) return null;
  if (value.length > maxLength) return null;
  return value;
}

export async function POST(request) {
  try {
    const clientIp = getClientIp(request);
    if (isRateLimited(clientIp)) {
      return NextResponse.json(
        { error: "Terlalu banyak percobaan pendaftaran. Coba lagi sebentar lagi." },
        { status: 429 }
      );
    }

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

    const finalThumbnail = validateOptionalDataUrl(
      photoThumbnail,
      MAX_THUMBNAIL_DATA_URL_LENGTH
    );
    const finalCard = validateOptionalDataUrl(photoCard, MAX_CARD_DATA_URL_LENGTH);
    if (finalThumbnail === null || finalCard === null) {
      return NextResponse.json(
        { error: "Format gambar tidak valid atau ukuran gambar terlalu besar." },
        { status: 400 }
      );
    }

    let photoUrl = "";

    if (photoBase64 && typeof photoBase64 === "string") {
      const base64Match = photoBase64.match(
        /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/i
      );
      if (!base64Match) {
        return NextResponse.json(
          { error: "Format foto tidak valid. Gunakan JPEG/PNG/WEBP." },
          { status: 400 }
        );
      }
      const mimeType = base64Match[1].toLowerCase();
      const base64Data = base64Match[2];
      const buffer = Buffer.from(base64Data, "base64");
      if (buffer.byteLength > MAX_UPLOAD_BYTES) {
        return NextResponse.json(
          { error: "Ukuran foto terlalu besar. Maksimal 4MB." },
          { status: 400 }
        );
      }
      const ext =
        mimeType === "image/png"
          ? "png"
          : mimeType === "image/webp"
            ? "webp"
            : "jpg";
      const storageRef = ref(
        storage,
        `players/${Date.now()}_register.${ext}`
      );
      await uploadBytes(storageRef, new Uint8Array(buffer), {
        contentType: mimeType,
      });
      photoUrl = await getDownloadURL(storageRef);
    } else if (photoBase64) {
      return NextResponse.json(
        { error: "Format foto tidak valid." },
        { status: 400 }
      );
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
    const createdAt = new Date().toISOString();
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
        createdAt,
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
