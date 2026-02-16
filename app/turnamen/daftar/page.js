"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Html5Qrcode } from "html5-qrcode";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { db } from "../../../firebase";

const SCANNER_CONTAINER_ID = "turnamen-daftar-qr-reader";

function parsePlayerIdFromDecoded(decodedText) {
  const raw = (decodedText && decodedText.trim()) || "";
  if (!raw) return null;
  try {
    if (raw.startsWith("http")) {
      const url = new URL(raw);
      const segments = url.pathname.split("/").filter(Boolean);
      return segments[segments.length - 1] || raw;
    }
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export default function TurnamenDaftarPage() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [player1, setPlayer1] = useState({ id: null, name: "" });
  const [player2, setPlayer2] = useState({ id: null, name: "" });
  const [scanningSlot, setScanningSlot] = useState(null); // null | "1" | "2"
  const [tournament, setTournament] = useState(null); // { id, namaTurnamen, jumlahTim, teams }
  const [loadingCode, setLoadingCode] = useState(false);
  const [codeError, setCodeError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const scannerRef = useRef(null);

  useEffect(() => {
    const q = searchParams.get("code");
    if (q) setCode(String(q).trim().toUpperCase());
  }, [searchParams]);

  const lookupTournament = async () => {
    const c = code.trim().toUpperCase();
    if (!c) {
      setCodeError("Masukkan kode turnamen.");
      return;
    }
    setCodeError("");
    setLoadingCode(true);
    setTournament(null);
    try {
      const q = query(collection(db, "tournaments"), where("code", "==", c));
      const snap = await getDocs(q);
      if (snap.empty) {
        setCodeError("Kode turnamen tidak ditemukan.");
        setLoadingCode(false);
        return;
      }
      const tournamentDoc = snap.docs[0];
      const data = tournamentDoc.data();
      setTournament({
        id: tournamentDoc.id,
        namaTurnamen: data.namaTurnamen || "",
        jumlahTim: data.jumlahTim || 8,
        teams: data.teams || [],
      });
    } catch (e) {
      console.error(e);
      setCodeError("Gagal memuat. Cek koneksi.");
    } finally {
      setLoadingCode(false);
    }
  };

  useEffect(() => {
    if (!scanningSlot) return;
    let cancelled = false;

    const startScan = async () => {
      try {
        if (!scannerRef.current) {
          scannerRef.current = new Html5Qrcode(SCANNER_CONTAINER_ID);
        }
        await scannerRef.current.start(
          { facingMode: "environment" },
          { fps: 8, qrbox: { width: 260, height: 260 } },
          async (decodedText) => {
            if (cancelled) return;
            const playerId = parsePlayerIdFromDecoded(decodedText);
            if (!playerId) return;

            try {
              if (scannerRef.current) {
                try {
                  await scannerRef.current.stop();
                } catch (_) {}
                try {
                  scannerRef.current.clear();
                } catch (_) {}
                scannerRef.current = null;
              }
            } catch (_) {}

            const snap = await getDoc(doc(db, "players", playerId));
            if (!snap.exists()) {
              setSubmitError("Pemain tidak ditemukan. Pastikan QR dari data registrasi.");
              setScanningSlot(null);
              return;
            }
            const name = snap.data().name || playerId;
            if (scanningSlot === "1") {
              setPlayer1({ id: playerId, name });
            } else {
              setPlayer2({ id: playerId, name });
            }
            setSubmitError("");
            setScanningSlot(null);
          }
        );
      } catch (e) {
        console.error(e);
        setSubmitError("Kamera/scanner error. Izinkan akses kamera dan coba lagi.");
        setScanningSlot(null);
      }
    };

    startScan();
    return () => {
      cancelled = true;
      const s = scannerRef.current;
      scannerRef.current = null;
      if (s) {
        try {
          s.stop().catch(() => {});
        } catch (_) {}
        try {
          s.clear().catch(() => {});
        } catch (_) {}
      }
    };
  }, [scanningSlot]);

  const handleDaftar = async () => {
    if (!tournament) return;
    if (!player1.id || !player2.id) {
      setSubmitError("Scan QR pemain 1 dan pemain 2.");
      return;
    }
    if (player1.id === player2.id) {
      setSubmitError("Pemain 1 dan pemain 2 harus berbeda.");
      return;
    }
    const maxTeams = Number(tournament.jumlahTim) || 8;
    if ((tournament.teams || []).length >= maxTeams) {
      setSubmitError("Pendaftaran penuh.");
      return;
    }
    setSubmitError("");
    setSubmitting(true);
    try {
      await updateDoc(doc(db, "tournaments", tournament.id), {
        teams: arrayUnion({ player1Id: player1.id, player2Id: player2.id }),
      });
      setSubmitSuccess(true);
      setPlayer1({ id: null, name: "" });
      setPlayer2({ id: null, name: "" });
      setTournament((t) => ({
        ...t,
        teams: [...(t.teams || []), { player1Id: player1.id, player2Id: player2.id }],
      }));
    } catch (e) {
      console.error(e);
      setSubmitError("Gagal mendaftar. Cek koneksi.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmitSuccess(false);
    setSubmitError("");
    setPlayer1({ id: null, name: "" });
    setPlayer2({ id: null, name: "" });
  };

  const isFull = tournament && (tournament.teams || []).length >= (Number(tournament.jumlahTim) || 8);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0B0B0B",
        color: "#fff",
        padding: "max(24px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(24px, env(safe-area-inset-left))",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: "480px", margin: "0 auto" }}>
        <h1 style={{ margin: "0 0 8px", fontSize: "20px", color: "#E8FFF9" }}>Pendaftaran turnamen</h1>
        <p style={{ margin: "0 0 24px", fontSize: "13px", color: "#888" }}>
          Masukkan kode turnamen, lalu scan QR pemain 1 &amp; 2.
        </p>

        {/* Kode turnamen */}
        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", marginBottom: "6px", color: "#aaa", fontSize: "13px" }}>Kode turnamen</label>
          <div style={{ display: "flex", gap: "8px" }}>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Contoh: ABC123"
              maxLength={12}
              style={{
                flex: 1,
                padding: "12px 14px",
                background: "#121212",
                border: "1px solid #333",
                borderRadius: "10px",
                color: "#fff",
                fontSize: "16px",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            />
            <button
              type="button"
              onClick={lookupTournament}
              disabled={loadingCode}
              style={{
                padding: "12px 20px",
                background: "#1a3a3a",
                border: "1px solid #4FD1C5",
                borderRadius: "10px",
                color: "#4FD1C5",
                fontWeight: 600,
                cursor: loadingCode ? "wait" : "pointer",
              }}
            >
              {loadingCode ? "..." : "Cari"}
            </button>
          </div>
          {codeError && <p style={{ margin: "8px 0 0", color: "#FF6B6B", fontSize: "13px" }}>{codeError}</p>}
        </div>

        {tournament && (
          <div
            style={{
              marginBottom: "24px",
              padding: "14px 16px",
              background: "#121212",
              borderRadius: "12px",
              border: "1px solid #2a2a2a",
            }}
          >
            <div style={{ fontWeight: 600, color: "#9FF5EA" }}>{tournament.namaTurnamen || "Turnamen"}</div>
            <div style={{ fontSize: "13px", color: "#888", marginTop: "4px" }}>
              Terdaftar: {(tournament.teams || []).length} / {tournament.jumlahTim} tim
            </div>
          </div>
        )}

        {tournament && !isFull && (
          <>
            {/* Scan pemain 1 */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", marginBottom: "6px", color: "#aaa", fontSize: "13px" }}>Pemain 1</label>
              {player1.id ? (
                <div
                  style={{
                    padding: "12px 14px",
                    background: "#0f2a28",
                    borderRadius: "10px",
                    border: "1px solid #2d6a64",
                    color: "#9FF5EA",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>{player1.name}</span>
                  <button
                    type="button"
                    onClick={() => setPlayer1({ id: null, name: "" })}
                    style={{
                      padding: "6px 10px",
                      background: "transparent",
                      border: "1px solid #555",
                      borderRadius: "8px",
                      color: "#aaa",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    Hapus
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setScanningSlot("1")}
                  style={{
                    width: "100%",
                    padding: "14px",
                    background: "#1a1212",
                    border: "1px dashed #4FD1C5",
                    borderRadius: "10px",
                    color: "#4FD1C5",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  Scan QR pemain 1
                </button>
              )}
            </div>

            {/* Scan pemain 2 */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", marginBottom: "6px", color: "#aaa", fontSize: "13px" }}>Pemain 2</label>
              {player2.id ? (
                <div
                  style={{
                    padding: "12px 14px",
                    background: "#0f2a28",
                    borderRadius: "10px",
                    border: "1px solid #2d6a64",
                    color: "#9FF5EA",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span>{player2.name}</span>
                  <button
                    type="button"
                    onClick={() => setPlayer2({ id: null, name: "" })}
                    style={{
                      padding: "6px 10px",
                      background: "transparent",
                      border: "1px solid #555",
                      borderRadius: "8px",
                      color: "#aaa",
                      fontSize: "12px",
                      cursor: "pointer",
                    }}
                  >
                    Hapus
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setScanningSlot("2")}
                  style={{
                    width: "100%",
                    padding: "14px",
                    background: "#1a1212",
                    border: "1px dashed #4FD1C5",
                    borderRadius: "10px",
                    color: "#4FD1C5",
                    fontSize: "14px",
                    cursor: "pointer",
                  }}
                >
                  Scan QR pemain 2
                </button>
              )}
            </div>

            {submitSuccess && (
              <p style={{ marginBottom: "12px", color: "#4FD1C5", fontSize: "14px" }}>Tim terdaftar. Silakan daftar tim berikutnya atau reset form.</p>
            )}
            {submitError && <p style={{ marginBottom: "12px", color: "#FF6B6B", fontSize: "13px" }}>{submitError}</p>}

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                type="button"
                onClick={resetForm}
                style={{
                  padding: "12px 18px",
                  background: "transparent",
                  border: "1px solid #555",
                  borderRadius: "10px",
                  color: "#aaa",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Reset
              </button>
              <button
                type="button"
                onClick={handleDaftar}
                disabled={submitting || !player1.id || !player2.id}
                style={{
                  flex: 1,
                  padding: "14px",
                  background: player1.id && player2.id ? "rgba(79, 209, 197, 0.2)" : "#1a2a2a",
                  border: "1px solid",
                  borderColor: player1.id && player2.id ? "#4FD1C5" : "#333",
                  borderRadius: "10px",
                  color: player1.id && player2.id ? "#9FF5EA" : "#666",
                  fontSize: "15px",
                  fontWeight: 600,
                  cursor: player1.id && player2.id && !submitting ? "pointer" : "not-allowed",
                }}
              >
                {submitting ? "Mendaftarkan..." : "Daftar tim"}
              </button>
            </div>
          </>
        )}

        {tournament && isFull && (
          <p style={{ padding: "16px", background: "#2a1a1a", borderRadius: "10px", border: "1px solid #4a3333", color: "#E87A7A" }}>
            Pendaftaran penuh ({tournament.jumlahTim} tim). Tidak bisa menambah tim baru.
          </p>
        )}

        {/* Scanner modal */}
        {scanningSlot && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.9)",
              zIndex: 100,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
            }}
            >
              <p style={{ marginBottom: "16px", color: "#9FF5EA", fontSize: "16px" }}>
                Scan QR pemain {scanningSlot}
              </p>
              <div
                id={SCANNER_CONTAINER_ID}
                style={{
                  width: "min(300px, 90vw)",
                  borderRadius: "12px",
                  overflow: "hidden",
                  border: "2px solid #4FD1C5",
                }}
              />
              <button
                type="button"
                onClick={() => setScanningSlot(null)}
                style={{
                  marginTop: "20px",
                  padding: "12px 24px",
                  background: "transparent",
                  border: "1px solid #555",
                  borderRadius: "10px",
                  color: "#aaa",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Batal
              </button>
            </div>
        )}
      </div>
    </main>
  );
}
