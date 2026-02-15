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

export default function BaristaPage() {
  const [view, setView] = useState("scan"); // "scan" | "success" | "error"
  const [message, setMessage] = useState("");
  const [successPlayer, setSuccessPlayer] = useState(null); // { name, photoUrl }
  const scannerRef = useRef(null);
  const containerId = "barista-qr-reader";
  const lastClaimTimeRef = useRef(0);

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
            const raw = decodedText.trim();
            const playerId = raw.startsWith("http")
              ? new URL(raw).pathname.split("/").pop() || raw
              : decodeURIComponent(raw);

            if (Date.now() - lastClaimTimeRef.current < RATE_LIMIT_MS) {
              stopScanner();
              setMessage("Tunggu 7 detik sebelum scan lagi.");
              setView("error");
              return;
            }

            try {
              const playerSnap = await getDoc(doc(db, "players", playerId));
              if (!playerSnap.exists()) {
                stopScanner();
                setMessage("Pemain tidak ditemukan.");
                setView("error");
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
                stopScanner();
                setMessage("Belum bermain hari ini.");
                setView("error");
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
                stopScanner();
                setMessage("Sudah pernah dapat minuman hari ini.");
                setView("error");
                return;
              }

              await addDoc(collection(db, "drinkClaims"), {
                playerId,
                playerName: playerData.name || playerId,
                dayKey: today,
                claimedAt: new Date().toISOString(),
              });
              lastClaimTimeRef.current = Date.now();
              stopScanner();
              setSuccessPlayer({
                name: playerData.name || playerId,
                photoUrl: playerData.photoUrl || "",
              });
              setView("success");
            } catch (err) {
              stopScanner();
              setMessage("Koneksi gagal, coba lagi.");
              setView("error");
            }
          }
        );
      } catch (e) {
        setMessage("Scanner tidak bisa dijalankan. Izinkan akses kamera.");
        setView("error");
      }
    };

    function stopScanner() {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
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
