"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "../../../../../firebase";
import { HOST_AUTH_KEY } from "../../../lib/dashboard";

const MONTHS = "Jan Feb Mar Apr Mei Jun Jul Agt Sep Okt Nov Des".split(" ");

function formatDayKey(dayKey) {
  if (!dayKey || dayKey.length < 10) return dayKey;
  const [y, m, d] = dayKey.split("-");
  const mi = parseInt(m, 10) - 1;
  return `${parseInt(d, 10)} ${MONTHS[mi]} ${y}`;
}

export default function TurnamenBaganPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const [hostChecked, setHostChecked] = useState(false);
  const [tournament, setTournament] = useState(null);
  const [nameMap, setNameMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [registerLink, setRegisterLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!sessionStorage.getItem(HOST_AUTH_KEY)) {
      router.replace("/host");
      return;
    }
    setHostChecked(true);
  }, [router]);

  useEffect(() => {
    if (!hostChecked || !id) return;
    setLoading(true);
    setError("");
    const load = async () => {
      try {
        const [tourSnap, playersSnap] = await Promise.all([
          getDoc(doc(db, "tournaments", id)),
          getDocs(collection(db, "players")),
        ]);
        if (!tourSnap.exists()) {
          setError("Turnamen tidak ditemukan.");
          setTournament(null);
          setLoading(false);
          return;
        }
        const data = tourSnap.data();
        setTournament({ id: tourSnap.id, ...data });
        if (data.code && typeof window !== "undefined") {
          setRegisterLink(`${window.location.origin}/turnamen/daftar?code=${data.code}`);
        }
        const map = {};
        playersSnap.docs.forEach((d) => {
          map[d.id] = d.data().name || d.id;
        });
        setNameMap(map);
      } catch (e) {
        console.error(e);
        setError("Gagal memuat. Cek koneksi.");
        setTournament(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [hostChecked, id]);

  if (!hostChecked) return null;

  const teams = tournament?.teams || [];
  const maxTim = Number(tournament?.jumlahTim) || 8;

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
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <h1 style={{ margin: 0, fontSize: "22px", color: "#E8FFF9" }}>Bagan turnamen</h1>
          <Link
            href="/turnamen"
            style={{
              background: "transparent",
              border: "1px solid #444",
              color: "#9FF5EA",
              padding: "10px 16px",
              borderRadius: "10px",
              fontSize: "14px",
              textDecoration: "none",
            }}
          >
            ← Lomba
          </Link>
        </div>

        {loading && <p style={{ color: "#9A9A9A", textAlign: "center", padding: "24px" }}>Memuat...</p>}
        {error && <p style={{ color: "#FF6B6B", marginBottom: "16px" }}>{error}</p>}

        {!loading && tournament && (
          <>
            <section
              style={{
                marginBottom: "24px",
                padding: "16px",
                background: "#121212",
                borderRadius: "12px",
                border: "1px solid #222",
              }}
            >
              <h2 style={{ margin: "0 0 8px", fontSize: "18px", color: "#fff" }}>{tournament.namaTurnamen || "Turnamen"}</h2>
              <p style={{ margin: 0, fontSize: "13px", color: "#888" }}>
                {formatDayKey(tournament.tanggalMulai)} – {formatDayKey(tournament.tanggalSelesai)} · {maxTim} tim
              </p>
            </section>

            <section
              style={{
                marginBottom: "24px",
                padding: "16px",
                background: "rgba(79, 209, 197, 0.1)",
                borderRadius: "12px",
                border: "1px solid #2d6a64",
              }}
            >
              <h2 style={{ margin: "0 0 12px", fontSize: "14px", color: "#4FD1C5", letterSpacing: "0.05em" }}>KODE TURNAMEN (untuk pendaftaran di meja)</h2>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                <p style={{ margin: 0, fontSize: "24px", fontWeight: 700, letterSpacing: "0.2em", color: "#9FF5EA" }}>
                  {tournament.code || "–"}
                </p>
                {registerLink && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(registerLink).then(() => {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      });
                    }}
                    style={{
                      padding: "10px 16px",
                      background: "#0B2A28",
                      border: "1px solid #4FD1C5",
                      borderRadius: "10px",
                      color: "#9FF5EA",
                      fontSize: "14px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {copied ? "Tersalin!" : "Link turnamen"}
                  </button>
                )}
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: "#888" }}>
                Berikan kode ini ke panitia meja atau peserta untuk daftar. Klik &quot;Link turnamen&quot; untuk menyalin link, lalu tempel (paste) di mana saja.
              </p>
              {registerLink && (
                <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                  <p style={{ margin: 0, fontSize: "12px", color: "#888" }}>Scan untuk buka halaman pendaftaran</p>
                  <div style={{ padding: "12px", background: "#fff", borderRadius: "12px", display: "inline-flex" }}>
                    <QRCodeSVG value={registerLink} size={180} level="M" bgColor="#ffffff" fgColor="#0B0B0B" />
                  </div>
                </div>
              )}
            </section>

            <section
              style={{
                marginBottom: "24px",
                padding: "16px",
                background: "#121212",
                borderRadius: "12px",
                border: "1px solid #222",
              }}
            >
              <h2 style={{ margin: "0 0 12px", fontSize: "14px", color: "#4FD1C5", letterSpacing: "0.05em" }}>TIM TERDAFTAR ({teams.length} / {maxTim})</h2>
              {teams.length === 0 ? (
                <p style={{ color: "#888", fontSize: "14px" }}>Belum ada tim terdaftar.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {teams.map((team, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "12px 14px",
                        background: "#0B0B0B",
                        borderRadius: "10px",
                        border: "1px solid #2a2a2a",
                        fontSize: "14px",
                        color: "#fff",
                      }}
                    >
                      <strong>Tim {i + 1}:</strong> {nameMap[team.player1Id] || team.player1Id} + {nameMap[team.player2Id] || team.player2Id}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </main>
  );
}
