"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Html5Qrcode } from "html5-qrcode";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";

const PLAYER_SESSION_KEY = "padelkecil:player:id";

function parsePlayerIdFromQr(decodedText) {
  const raw = (decodedText && decodedText.trim()) || "";
  if (!raw) return "";
  try {
    if (raw.startsWith("http")) {
      try {
        const p = new URL(raw).pathname.split("/").filter(Boolean);
        return (p[p.length - 1] || "").trim();
      } catch {
        return decodeURIComponent(raw).trim();
      }
    }
    return decodeURIComponent(raw).trim();
  } catch {
    return raw.trim();
  }
}

export default function PemainLoginPage() {
  const router = useRouter();
  const scannerRef = useRef(null);
  const streamRef = useRef(null); // simpan stream kamera supaya bisa di-stop pas unmount
  const containerId = "pemain-qr-reader";
  const processingRef = useRef(false);
  const [status, setStatus] = useState("scan"); // scan | loading | error
  const [message, setMessage] = useState("");
  const fileInputRef = useRef(null);

  const handleDecodedText = useCallback(async (decodedText, { fromFile = false } = {}) => {
    const playerId = parsePlayerIdFromQr(decodedText);
    if (!playerId) {
      setMessage("QR tidak valid. Coba scan ulang.");
      setStatus("error");
      processingRef.current = false;
      return;
    }

    try {
      const snap = await getDoc(doc(db, "players", playerId));
      if (!snap.exists()) {
        setMessage("Pemain tidak ditemukan. Pastikan QR benar.");
        setStatus("error");
        processingRef.current = false;
        return;
      }
      const data = snap.data() || {};
      if (data.status && String(data.status).toLowerCase() !== "active") {
        setMessage("Akun pemain tidak aktif.");
        setStatus("error");
        processingRef.current = false;
        return;
      }

      try {
        localStorage.setItem(PLAYER_SESSION_KEY, playerId);
      } catch {}

      try {
        if (!fromFile && navigator.vibrate) navigator.vibrate([80, 40, 80]);
      } catch {}

      router.replace("/pemain");
    } catch (e) {
      console.error(e);
      setMessage("Koneksi gagal. Coba lagi.");
      setStatus("error");
      processingRef.current = false;
    }
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const existing = localStorage.getItem(PLAYER_SESSION_KEY);
    if (existing) router.replace("/pemain");
  }, [router]);

  // Stop kamera pas halaman ditutup / pindah (unmount). Urutan: stop scanner dulu
  // (biar library bersihkan video/stream), baru kosongkan container. Jangan stop
  // stream manual sebelum scanner.stop() selesai — itu memicu onabort() di library.
  const stopAllSafe = async () => {
    const s = scannerRef.current;
    const stream = streamRef.current;
    scannerRef.current = null;
    streamRef.current = null;

    if (s) {
      try {
        const p = s.stop();
        if (p && typeof p.then === "function") await p;
      } catch (_) {}
      try {
        s.clear();
      } catch (_) {}
    }

    // Kosongkan container setelah scanner beres (hindari video surface onabort)
    try {
      const el = typeof document !== "undefined" ? document.getElementById(containerId) : null;
      if (el) el.innerHTML = "";
    } catch (_) {}

    // Stop stream sisa hanya kalau tadi tidak ada scanner (stream orphan)
    if (!s && stream && stream.getTracks) {
      try {
        stream.getTracks().forEach((t) => t.stop());
      } catch (_) {}
    }
  };

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") stopAllSafe();
    };
    const onPageHide = () => stopAllSafe();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
      stopAllSafe();
    };
  }, []);

  useEffect(() => {
    if (status !== "scan") return;
    let cancelled = false;

    const stopScanner = async () => {
      await stopAllSafe();
    };

    const start = async () => {
      try {
        await stopAllSafe();
        const container = document.getElementById(containerId);
        if (container) container.innerHTML = "";
        if (!scannerRef.current) scannerRef.current = new Html5Qrcode(containerId);
        await scannerRef.current.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 260 } },
          async (decodedText) => {
            if (cancelled) return;
            if (processingRef.current) return;
            processingRef.current = true;
            setStatus("loading");
            // Jangan panggil stopScanner() di sini — library bisa lempar
            // "Cannot transition to a new state, already under transition".
            // Pembersihan akan jalan saat unmount/navigate (router.replace).
            await handleDecodedText(decodedText);
          }
        );
        // Simpan stream kamera supaya bisa di-stop pas back/unmount
        setTimeout(() => {
          try {
            const el = document.getElementById(containerId);
            const video = el?.querySelector("video");
            if (video?.srcObject) streamRef.current = video.srcObject;
          } catch (_) {}
        }, 300);
      } catch (e) {
        const msg = String(e || "");
        // Error dari html5-qrcode saat dev/StrictMode:
        // "Cannot transition to a new state, already under transition"
        // Itu race internal library, biasanya aman diabaikan karena
        // mount kedua akan berhasil. Jadi jangan tampilkan error besar.
        if (msg.includes("Cannot transition to a new state, already under transition")) {
          return;
        }
        console.error(e);
        setMessage("Scanner tidak bisa dijalankan. Izinkan akses kamera.");
        setStatus("error");
      }
    };

    start();

    return () => {
      cancelled = true;
      stopScanner().catch(() => {});
    };
  }, [status, handleDecodedText]);

  const handleFilePick = () => {
    if (!fileInputRef.current) return;
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    setMessage("");
    setStatus("loading");
    processingRef.current = true;

    try {
      await stopAllSafe();
      const fileScanner = new Html5Qrcode(containerId);
      const decodedText = await fileScanner.scanFile(file, false);
      await handleDecodedText(decodedText, { fromFile: true });
    } catch (err) {
      console.error(err);
      setMessage("QR tidak bisa dibaca dari foto. Pastikan foto jelas dan tidak blur.");
      setStatus("error");
      processingRef.current = false;
    }
  };

  return (
    <main
      style={{
        minHeight: "calc(100vh - 120px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        background: "#0B0B0B",
      }}
    >
      <div style={{ width: "100%", maxWidth: 420 }}>
        <div
          style={{
            borderRadius: 18,
            padding: 18,
            border: "1px solid rgba(79,209,197,0.55)",
            background: "rgba(8, 20, 26, 0.88)",
            boxShadow: "0 0 26px rgba(79,209,197,0.18)",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 14 }}>
            <div
              style={{
                fontSize: 14,
                letterSpacing: "0.22em",
                textTransform: "uppercase",
                color: "#9FF5EA",
                marginBottom: 6,
              }}
            >
              Login pemain
            </div>
            <div style={{ fontSize: 12, color: "#BEE3F8", lineHeight: 1.6 }}>
              Scan QR pada kartu pemain untuk masuk.
            </div>
          </div>

          {status !== "error" ? (
            <>
              <div
                id={containerId}
                style={{
                  width: "100%",
                  borderRadius: 16,
                  overflow: "hidden",
                  border: "1px solid rgba(79,209,197,0.35)",
                  background: "#000",
                }}
              />
              {status === "loading" && (
                <div style={{ marginTop: 12, textAlign: "center", fontSize: 12, color: "#9FF5EA" }}>
                  Memverifikasi…
                </div>
              )}
              <div
                style={{
                  marginTop: 10,
                  textAlign: "center",
                  fontSize: 12,
                  color: "#A0AEC0",
                }}
              >
                Atau{" "}
                <button
                  type="button"
                  onClick={handleFilePick}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "#9FF5EA",
                    textDecoration: "underline",
                    cursor: "pointer",
                    fontSize: 12,
                  }}
                >
                  pilih foto QR dari galeri
                </button>
                .
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
            </>
          ) : (
            <>
              <div
                style={{
                  textAlign: "center",
                  color: "#FEB2B2",
                  fontSize: 12,
                  lineHeight: 1.6,
                  padding: "10px 6px",
                }}
              >
                {message}
              </div>
              <button
                type="button"
                onClick={() => {
                  processingRef.current = false;
                  setMessage("");
                  setStatus("scan");
                }}
                style={{
                  width: "100%",
                  marginTop: 10,
                  padding: "14px 16px",
                  borderRadius: 14,
                  border: "1px solid rgba(79,209,197,0.6)",
                  background: "rgba(15, 118, 110, 0.9)",
                  color: "#E6FFFA",
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                }}
              >
                Scan lagi
              </button>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

