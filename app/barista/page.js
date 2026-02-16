"use client";

import { useState, useRef, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  where,
  addDoc,
} from "firebase/firestore";
import { db } from "../../firebase";
import { getTodayKey } from "../lib/dashboard";

const RATE_LIMIT_MS = 7000;
const AUTO_RESET_MS = 10000;
const BARISTA_PIN_KEY = "padelkecil:barista:unlocked";

const baristaPin = process.env.NEXT_PUBLIC_BARISTA_PIN ?? "";

export default function BaristaPage() {
  const [unlocked, setUnlocked] = useState(false);
  const [pinInput, setPinInput] = useState("");
  const [pinError, setPinError] = useState("");
  const [view, setView] = useState("scan"); // "scan" | "success" | "error"
  const [message, setMessage] = useState("");
  const [successPlayer, setSuccessPlayer] = useState(null); // { name, photoUrl }
  const scannerRef = useRef(null);
  const containerId = "barista-qr-reader";
  const lastClaimTimeRef = useRef(0);
  const processingRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = sessionStorage.getItem(BARISTA_PIN_KEY);
    if (saved === "1") setUnlocked(true);
  }, []);

  const handlePinSubmit = (e) => {
    e.preventDefault();
    setPinError("");
    const ok = baristaPin === "" ? true : pinInput === baristaPin;
    if (ok) {
      sessionStorage.setItem(BARISTA_PIN_KEY, "1");
      setUnlocked(true);
      setPinInput("");
    } else {
      setPinError("PIN salah.");
    }
  };

  useEffect(() => {
    if (view !== "scan") return;
    let cancelled = false;

    const startScan = async () => {
      try {
        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode(containerId);
        }
        await scannerRef.current.start(
          { facingMode: "environment" },
          { fps: 8, qrbox: { width: 260, height: 260 } },
          async (decodedText) => {
            if (cancelled) return;
            if (processingRef.current) return;
            processingRef.current = true;
            try {
              stopScanner();
            } catch (_) {}

            const showError = (msg) => {
              processingRef.current = false;
              setTimeout(() => {
                setMessage(msg);
                setView("error");
              }, 0);
            };
            const showSuccess = (player) => {
              processingRef.current = false;
              setTimeout(() => {
                setSuccessPlayer(player);
                setView("success");
                try {
                  if (typeof navigator !== "undefined" && navigator.vibrate) {
                    navigator.vibrate([100, 50, 100]);
                  }
                } catch (_) {}
              }, 0);
            };

            try {
              const raw = (decodedText && decodedText.trim()) || "";
              if (!raw) {
                showError("QR tidak terbaca. Coba lagi.");
                return;
              }
              let playerId;
              try {
                playerId = raw.startsWith("http")
                  ? (() => {
                      try {
                        const p = new URL(raw).pathname.split("/").filter(Boolean);
                        return p[p.length - 1] || decodeURIComponent(raw);
                      } catch {
                        return decodeURIComponent(raw);
                      }
                    })()
                  : decodeURIComponent(raw);
              } catch {
                showError("Format QR tidak valid.");
                return;
              }
              if (!playerId) {
                showError("Format QR tidak valid.");
                return;
              }

              if (Date.now() - lastClaimTimeRef.current < RATE_LIMIT_MS) {
                showError("Tunggu 7 detik sebelum scan lagi.");
                return;
              }

              try {
                const playerSnap = await getDoc(doc(db, "players", playerId));
                if (!playerSnap.exists()) {
                  showError("Pemain tidak ditemukan.");
                  return;
                }
                const playerData = playerSnap.data();
                const today = getTodayKey();

                const matchesSnap = await getDocs(
                  query(
                    collection(db, "matches"),
                    where("dayKey", "==", today)
                  )
                );
                let playedToday = false;
                matchesSnap.docs.forEach((d) => {
                  const data = d.data();
                  const t1 = data.team1PlayerIds || [];
                  const t2 = data.team2PlayerIds || [];
                  if (t1.includes(playerId) || t2.includes(playerId)) playedToday = true;
                });
                if (!playedToday) {
                  showError("Belum bermain hari ini.");
                  return;
                }

                const claimsSnap = await getDocs(
                  query(
                    collection(db, "drinkClaims"),
                    where("dayKey", "==", today),
                    where("playerId", "==", playerId)
                  )
                );
                if (!claimsSnap.empty) {
                  showError("Sudah pernah dapat minuman hari ini.");
                  return;
                }

                await addDoc(collection(db, "drinkClaims"), {
                  playerId,
                  playerName: playerData.name || playerId,
                  dayKey: today,
                  claimedAt: new Date().toISOString(),
                });
                lastClaimTimeRef.current = Date.now();
                showSuccess({
                  name: playerData.name || playerId,
                  photoUrl: playerData.photoUrl || "",
                });
              } catch (err) {
                showError("Koneksi gagal, coba lagi.");
              }
            } catch (err) {
              showError("Terjadi kesalahan. Coba lagi.");
            }
          }
        );
      } catch (e) {
        setMessage("Scanner tidak bisa dijalankan. Izinkan akses kamera.");
        setView("error");
      }
    };

    function stopScanner() {
      if (!scannerRef.current) return;
      const s = scannerRef.current;
      scannerRef.current = null;
      try {
        s.stop().catch(() => {});
      } catch (_) {}
      try {
        s.clear().catch(() => {});
      } catch (_) {}
    }

    startScan();
    return () => {
      cancelled = true;
      stopScanner();
    };
  }, [view]);

  useEffect(() => {
    if (view !== "success") return;
    const t = setTimeout(() => setView("scan"), AUTO_RESET_MS);
    return () => clearTimeout(t);
  }, [view]);

  const goBackToScan = () => {
    setView("scan");
    setMessage("");
    setSuccessPlayer(null);
  };

  if (!unlocked) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0B0B0B",
          color: "#fff",
          padding: "max(24px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right))",
          fontFamily: "Inter, system-ui, sans-serif",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <p style={{ fontSize: "18px", color: "#9FF5EA", marginBottom: "20px" }}>
          Masukkan PIN barista
        </p>
        <form onSubmit={handlePinSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px", width: "min(280px, 90vw)" }}>
          <input
            type="password"
            inputMode="numeric"
            autoComplete="off"
            placeholder="PIN"
            value={pinInput}
            onChange={(e) => setPinInput(e.target.value)}
            style={{
              padding: "14px 16px",
              background: "#121212",
              border: "1px solid #333",
              borderRadius: "12px",
              color: "#fff",
              fontSize: "18px",
              textAlign: "center",
              letterSpacing: "0.2em",
            }}
          />
          {pinError && <p style={{ color: "#FF6B6B", fontSize: "14px", margin: 0 }}>{pinError}</p>}
          <button
            type="submit"
            style={{
              padding: "14px",
              background: "#4FD1C5",
              border: "none",
              borderRadius: "12px",
              color: "#0B0B0B",
              fontSize: "16px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Masuk
          </button>
        </form>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0B0B0B",
        color: "#fff",
        padding: "max(24px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(24px, env(safe-area-inset-left))",
        fontFamily: "Inter, system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {view === "scan" && (
        <>
          <p
            style={{
              marginBottom: "20px",
              fontSize: "clamp(16px, 4vw, 20px)",
              fontWeight: 600,
              letterSpacing: "0.05em",
              color: "#9FF5EA",
            }}
          >
            Scan untuk claim minuman
          </p>
          <div
            id={containerId}
            style={{
              width: "min(320px, 85vw)",
              borderRadius: "16px",
              overflow: "hidden",
              border: "2px solid #333",
            }}
          />
        </>
      )}

      {view === "success" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            padding: "24px",
          }}
        >
          {successPlayer?.photoUrl ? (
            <img
              src={successPlayer.photoUrl}
              alt={successPlayer.name}
              style={{
                width: 100,
                height: 100,
                borderRadius: "50%",
                objectFit: "cover",
                border: "3px solid #4FD1C5",
                marginBottom: "16px",
              }}
            />
          ) : (
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: "50%",
                background: "#222",
                border: "3px solid #4FD1C5",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "32px",
                color: "#666",
              }}
            >
              ?
            </div>
          )}
          <p style={{ fontSize: "20px", fontWeight: 600, color: "#E8FFF9", marginBottom: "8px" }}>
            {successPlayer?.name}
          </p>
          <p style={{ fontSize: "18px", color: "#4FD1C5", marginBottom: "32px" }}>
            Claim sukses
          </p>
          <p style={{ fontSize: "14px", color: "#9A9A9A", marginBottom: "16px" }}>
            Otomatis kembali dalam 10 detik, atau
          </p>
          <button
            type="button"
            onClick={goBackToScan}
            style={{
              padding: "14px 28px",
              background: "transparent",
              border: "1px solid #4FD1C5",
              borderRadius: "12px",
              color: "#9FF5EA",
              fontSize: "15px",
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Scan lagi
          </button>
        </div>
      )}

      {view === "error" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            padding: "24px",
          }}
        >
          <p style={{ fontSize: "18px", color: "#FF6B6B", marginBottom: "24px" }}>
            {message}
          </p>
          <button
            type="button"
            onClick={goBackToScan}
            style={{
              padding: "14px 28px",
              background: "#4FD1C5",
              border: "none",
              borderRadius: "12px",
              color: "#0B0B0B",
              fontSize: "15px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Scan lagi
          </button>
        </div>
      )}
    </div>
  );
}
