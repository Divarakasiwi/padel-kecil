"use client";

import { useEffect, useRef, useState } from "react";
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
  const containerId = "pemain-qr-reader";
  const processingRef = useRef(false);
  const [status, setStatus] = useState("scan"); // scan | loading | error
  const [message, setMessage] = useState("");
  const fileInputRef = useRef(null);

  const handleDecodedText = async (decodedText, { fromFile = false } = {}) => {
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
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const existing = localStorage.getItem(PLAYER_SESSION_KEY);
    if (existing) router.replace("/pemain");
  }, [router]);

  useEffect(() => {
    if (status !== "scan") return;
    let cancelled = false;

    const stopScanner = async () => {
      const s = scannerRef.current;
      scannerRef.current = null;
      if (!s) return;
      try {
        await s.stop();
      } catch {}
      try {
        await s.clear();
      } catch {}
    };

    const start = async () => {
      try {
        if (!scannerRef.current) scannerRef.current = new Html5Qrcode(containerId);
        await scannerRef.current.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 260, height: 260 } },
          async (decodedText) => {
            if (cancelled) return;
            if (processingRef.current) return;
            processingRef.current = true;
            setStatus("loading");

            try {
              await stopScanner();
            } catch {}

            await handleDecodedText(decodedText);
          }
        );
      } catch (e) {
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
  }, [status]);

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
      if (!scannerRef.current) {
        scannerRef.current = new Html5Qrcode(containerId);
      }
      const decodedText = await scannerRef.current.scanFile(file, false);
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
        background:
          "radial-gradient(circle at top, rgba(79,209,197,0.18), transparent 55%), #050608",
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

