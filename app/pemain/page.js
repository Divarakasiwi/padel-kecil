"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { QRCodeCanvas } from "qrcode.react";
import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebase";

const PLAYER_SESSION_KEY = "padelkecil:player:id";

function safeName(v) {
  return String(v || "").trim() || "Pemain";
}

export default function PemainHomePage() {
  const router = useRouter();
  const [playerId, setPlayerId] = useState("");
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [qrOpen, setQrOpen] = useState(false);
  const [stats, setStats] = useState({ loading: true, matches: [], wins: 0, draws: 0, losses: 0 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = localStorage.getItem(PLAYER_SESSION_KEY) || "";
    if (!id) {
      router.replace("/pemain/login");
      return;
    }
    setPlayerId(id);
  }, [router]);

  useEffect(() => {
    if (!playerId) return;
    let alive = true;
    const load = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, "players", playerId));
        if (!alive) return;
        if (!snap.exists()) {
          try { localStorage.removeItem(PLAYER_SESSION_KEY); } catch {}
          router.replace("/pemain/login");
          return;
        }
        const data = snap.data() || {};
        setPlayer({ id: playerId, ...data });
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => { alive = false; };
  }, [playerId, router]);

  useEffect(() => {
    if (!playerId) return;
    let alive = true;
    const loadStats = async () => {
      setStats((s) => ({ ...s, loading: true }));
      try {
        const q1 = query(collection(db, "matches"), where("team1PlayerIds", "array-contains", playerId));
        const q2 = query(collection(db, "matches"), where("team2PlayerIds", "array-contains", playerId));
        const [s1, s2] = await Promise.all([getDocs(q1), getDocs(q2)]);
        if (!alive) return;
        const byId = new Map();
        s1.docs.forEach((d) => byId.set(d.id, { id: d.id, ...d.data() }));
        s2.docs.forEach((d) => byId.set(d.id, { id: d.id, ...d.data() }));
        const matches = Array.from(byId.values()).sort((a, b) => String(b.finishedAt || "").localeCompare(String(a.finishedAt || "")));

        let wins = 0, draws = 0, losses = 0;
        matches.forEach((m) => {
          const winner = m.winner;
          const t1 = m.team1PlayerIds || [];
          const t2 = m.team2PlayerIds || [];
          const inT1 = t1.includes(playerId);
          const inT2 = t2.includes(playerId);
          if (winner === "draw") draws += 1;
          else if (winner === "team1" && inT1) wins += 1;
          else if (winner === "team2" && inT2) wins += 1;
          else if (winner === "team1" && inT2) losses += 1;
          else if (winner === "team2" && inT1) losses += 1;
        });

        setStats({ loading: false, matches, wins, draws, losses });
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setStats({ loading: false, matches: [], wins: 0, draws: 0, losses: 0 });
      }
    };
    loadStats();
    return () => { alive = false; };
  }, [playerId]);

  const profilePhoto = useMemo(() => {
    if (!player) return "";
    return player.photoThumbnail || player.photoUrl || "";
  }, [player]);

  const playerName = safeName(player?.name);

  const downloadQrJpeg = () => {
    try {
      const canvas = document.getElementById("player-qr-canvas");
      if (!canvas || !canvas.toDataURL) return;
      const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `QR-${playerName.replace(/\s+/g, "_")}.jpg`;
      a.click();
    } catch (e) {
      console.error(e);
    }
  };

  const logout = () => {
    try { localStorage.removeItem(PLAYER_SESSION_KEY); } catch {}
    router.replace("/");
  };

  return (
    <main
      style={{
        minHeight: "calc(100vh - 120px)",
        padding: "24px",
        background:
          "radial-gradient(circle at top, rgba(79,209,197,0.18), transparent 55%), #050608",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: 520 }}>
        <div
          style={{
            borderRadius: 22,
            padding: 18,
            border: "1px solid rgba(79,209,197,0.45)",
            background: "rgba(8, 20, 26, 0.88)",
            boxShadow: "0 0 28px rgba(79,209,197,0.14)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 999,
                border: "2px solid rgba(79,209,197,0.75)",
                boxShadow: "0 0 16px rgba(79,209,197,0.35)",
                background: "#0b0b0b",
                overflow: "hidden",
                flex: "0 0 auto",
              }}
            >
              {profilePhoto ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={profilePhoto}
                  alt={playerName}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
              ) : (
                <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "#9FF5EA", fontWeight: 800 }}>
                  {playerName.slice(0, 1).toUpperCase()}
                </div>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, letterSpacing: "0.22em", textTransform: "uppercase", color: "#9FF5EA" }}>
                Profil pemain
              </div>
              <div style={{ marginTop: 6, fontSize: 20, fontWeight: 800, letterSpacing: "0.06em", color: "#E8FFF9" }}>
                {loading ? "Memuat..." : playerName}
              </div>
            </div>
            <button
              type="button"
              onClick={logout}
              style={{
                padding: "10px 12px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.18)",
                background: "rgba(0,0,0,0.25)",
                color: "#E2E8F0",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              Keluar
            </button>
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            <div
              style={{
                borderRadius: 18,
                border: "1px solid rgba(79,209,197,0.25)",
                background: "rgba(0,0,0,0.25)",
                padding: 14,
              }}
            >
              <div style={{ fontSize: 12, color: "#BEE3F8", marginBottom: 10 }}>
                QR pemain (tap untuk membesar)
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div
                  onClick={() => setQrOpen(true)}
                  style={{
                    width: 200,
                    height: 200,
                    borderRadius: 16,
                    background: "#fff",
                    display: "grid",
                    placeItems: "center",
                    cursor: "pointer",
                    boxShadow: "0 0 18px rgba(79,209,197,0.18)",
                  }}
                >
                  <QRCodeCanvas
                    id="player-qr-canvas"
                    value={playerId || " "}
                    size={180}
                    includeMargin={true}
                    level="M"
                  />
                </div>
              </div>
              <div style={{ marginTop: 10, display: "flex", justifyContent: "center" }}>
                <button
                  type="button"
                  onClick={downloadQrJpeg}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 12,
                    border: "1px solid rgba(79,209,197,0.55)",
                    background: "rgba(15, 118, 110, 0.9)",
                    color: "#E6FFFA",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    cursor: "pointer",
                  }}
                >
                  Download JPEG QR
                </button>
              </div>
            </div>

            <div
              style={{
                borderRadius: 18,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(0,0,0,0.22)",
                padding: 14,
              }}
            >
              <div style={{ fontSize: 12, letterSpacing: "0.18em", textTransform: "uppercase", color: "#E2E8F0" }}>
                Statistik
              </div>

              {stats.loading ? (
                <div style={{ marginTop: 10, fontSize: 12, color: "#A0AEC0" }}>Memuat statistik…</div>
              ) : stats.matches.length === 0 ? (
                <div style={{ marginTop: 10, fontSize: 12, color: "#A0AEC0" }}>Belum ada pertandingan.</div>
              ) : (
                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                  <div style={{ padding: 10, borderRadius: 14, background: "rgba(79,209,197,0.12)", border: "1px solid rgba(79,209,197,0.25)" }}>
                    <div style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "#9FF5EA" }}>Main</div>
                    <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800, color: "#E8FFF9" }}>{stats.matches.length}</div>
                  </div>
                  <div style={{ padding: 10, borderRadius: 14, background: "rgba(56, 189, 248, 0.10)", border: "1px solid rgba(56, 189, 248, 0.22)" }}>
                    <div style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "#BAE6FD" }}>Menang</div>
                    <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800, color: "#E0F2FE" }}>{stats.wins}</div>
                  </div>
                  <div style={{ padding: 10, borderRadius: 14, background: "rgba(251, 113, 133, 0.10)", border: "1px solid rgba(251, 113, 133, 0.22)" }}>
                    <div style={{ fontSize: 10, letterSpacing: "0.16em", textTransform: "uppercase", color: "#FED7E2" }}>Seri</div>
                    <div style={{ marginTop: 6, fontSize: 18, fontWeight: 800, color: "#FFF5F7" }}>{stats.draws}</div>
                  </div>
                </div>
              )}

              <div style={{ marginTop: 12, fontSize: 11, color: "#718096" }}>
                Statistik diambil dari data match yang dibuat host.
              </div>
            </div>

            <div style={{ textAlign: "center", marginTop: 2 }}>
              <Link href="/" style={{ fontSize: 12, color: "#9FF5EA", textDecoration: "underline" }}>
                Kembali ke menu awal
              </Link>
            </div>
          </div>
        </div>
      </div>

      {qrOpen && (
        <div
          onClick={() => setQrOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.72)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(92vw, 420px)",
              borderRadius: 18,
              background: "#fff",
              padding: 18,
              boxShadow: "0 0 40px rgba(0,0,0,0.45)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <QRCodeCanvas value={playerId || " "} size={360} includeMargin={true} level="M" />
            <div style={{ marginTop: 12, fontSize: 12, color: "#111" }}>{playerName}</div>
          </div>
        </div>
      )}
    </main>
  );
}

