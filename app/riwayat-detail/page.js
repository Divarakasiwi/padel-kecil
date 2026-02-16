"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { HOST_AUTH_KEY } from "../lib/dashboard";

const MONTHS = "Jan Feb Mar Apr Mei Jun Jul Agt Sep Okt Nov Des".split(" ");

function toDayKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDayKey(dayKey) {
  if (!dayKey || dayKey.length < 10) return dayKey;
  const [y, m, d] = dayKey.split("-");
  const mi = parseInt(m, 10) - 1;
  return `${parseInt(d, 10)} ${MONTHS[mi]} ${y}`;
}

function formatTime(iso) {
  if (!iso) return "–";
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "–";
  }
}

function teamKey(ids) {
  return [...(ids || [])].filter(Boolean).sort().join(",");
}

export default function RiwayatDetailPage() {
  const router = useRouter();
  const [hostChecked, setHostChecked] = useState(false);
  const [players, setPlayers] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const today = new Date();
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const [dateFrom, setDateFrom] = useState(toDayKey(startOfMonth));
  const [dateTo, setDateTo] = useState(toDayKey(today));

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!sessionStorage.getItem(HOST_AUTH_KEY)) {
      router.replace("/host");
      return;
    }
    setHostChecked(true);
  }, [router]);

  useEffect(() => {
    if (!hostChecked) return;
    const loadPlayers = async () => {
      try {
        const snap = await getDocs(collection(db, "players"));
        setPlayers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
      }
    };
    loadPlayers();
  }, [hostChecked]);

  useEffect(() => {
    if (!hostChecked) return;
    setLoading(true);
    setError(null);
    const load = async () => {
      try {
        const q = query(
          collection(db, "matches"),
          where("dayKey", ">=", dateFrom),
          where("dayKey", "<=", dateTo)
        );
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => {
          const day = (a.dayKey || "").localeCompare(b.dayKey || "");
          if (day !== 0) return -day;
          return (b.finishedAt || "").localeCompare(a.finishedAt || "");
        });
        setMatches(list);
      } catch (e) {
        console.error(e);
        setError("Gagal memuat data. Cek koneksi atau coba rentang tanggal lebih sempit.");
        setMatches([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [hostChecked, dateFrom, dateTo]);

  const nameMap = players.reduce((acc, p) => {
    acc[p.id] = p.name || p.id;
    return acc;
  }, {});

  const teamDisplay = (ids) => (ids || []).map((id) => nameMap[id] || id).join(" + ");

  const pairKey = (a, b) => [a, b].sort().join(" & ");
  const pairings = {};
  const winsByTeam = {};
  const winsByPlayer = {};
  matches.forEach((m) => {
    const t1 = m.team1PlayerIds || [];
    const t2 = m.team2PlayerIds || [];
    if (t1.length >= 2) {
      const k = pairKey(t1[0], t1[1]);
      pairings[k] = (pairings[k] || 0) + 1;
    }
    if (t2.length >= 2) {
      const k = pairKey(t2[0], t2[1]);
      pairings[k] = (pairings[k] || 0) + 1;
    }
    const winner = m.winner;
    const k1 = teamKey(t1);
    const k2 = teamKey(t2);
    if (winner === "team1" && k1) {
      winsByTeam[k1] = (winsByTeam[k1] || 0) + 1;
      t1.forEach((id) => { winsByPlayer[id] = (winsByPlayer[id] || 0) + 1; });
    } else if (winner === "team2" && k2) {
      winsByTeam[k2] = (winsByTeam[k2] || 0) + 1;
      t2.forEach((id) => { winsByPlayer[id] = (winsByPlayer[id] || 0) + 1; });
    }
  });

  const topTeams = Object.entries(winsByTeam)
    .map(([key, wins]) => ({ ids: key.split(","), wins }))
    .sort((a, b) => b.wins - a.wins)
    .slice(0, 15)
    .map(({ ids, wins }) => ({ team: ids.map((id) => nameMap[id] || id).join(" + "), wins }));

  const topRank = Object.entries(winsByPlayer)
    .map(([id, wins]) => ({ id, name: nameMap[id] || id, wins }))
    .sort((a, b) => b.wins - a.wins)
    .slice(0, 20);

  const pairingList = Object.entries(pairings)
    .map(([key, count]) => {
      const [a, b] = key.split(" & ");
      return { names: [nameMap[a] || a, nameMap[b] || b].join(" & "), count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  if (!hostChecked) return null;

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
      <div style={{ maxWidth: "720px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <h1 style={{ margin: 0, fontSize: "22px", color: "#E8FFF9" }}>Detail riwayat pertandingan</h1>
          <Link
            href="/"
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
            ← Kembali ke dashboard
          </Link>
        </div>

        <section style={{ marginBottom: "24px", padding: "16px", background: "#121212", borderRadius: "12px", border: "1px solid #222" }}>
          <h2 style={{ margin: "0 0 12px", fontSize: "14px", color: "#4FD1C5", letterSpacing: "0.05em" }}>RENTANG TANGGAL</h2>
          <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "#888", fontSize: "13px" }}>Dari</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{
                  padding: "10px 12px",
                  background: "#0B0B0B",
                  border: "1px solid #333",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "14px",
                }}
              />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ color: "#888", fontSize: "13px" }}>Sampai</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{
                  padding: "10px 12px",
                  background: "#0B0B0B",
                  border: "1px solid #333",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "14px",
                }}
              />
            </label>
          </div>
          <p style={{ margin: "12px 0 0", fontSize: "13px", color: "#666" }}>
            Menampilkan dari <strong style={{ color: "#9FF5EA" }}>{formatDayKey(dateFrom)}</strong> sampai <strong style={{ color: "#9FF5EA" }}>{formatDayKey(dateTo)}</strong>
          </p>
        </section>

        {loading && (
          <p style={{ color: "#9A9A9A", textAlign: "center", padding: "24px" }}>Memuat...</p>
        )}
        {error && (
          <p style={{ color: "#FF6B6B", marginBottom: "16px" }}>{error}</p>
        )}

        {!loading && !error && matches.length === 0 && (
          <p style={{ color: "#9A9A9A", textAlign: "center", padding: "24px" }}>Tidak ada pertandingan untuk rentang ini.</p>
        )}

        {!loading && !error && matches.length > 0 && (
          <>
            <section style={{ marginBottom: "28px", padding: "16px", background: "#121212", borderRadius: "12px", border: "1px solid #222" }}>
              <h2 style={{ margin: "0 0 12px", fontSize: "14px", color: "#4FD1C5", letterSpacing: "0.05em" }}>DAFTAR PERTANDINGAN ({matches.length})</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {matches.map((m, i) => (
                  <div
                    key={m.id || i}
                    style={{
                      padding: "12px",
                      background: "#0B0B0B",
                      borderRadius: "10px",
                      border: "1px solid #2A2A2A",
                      fontSize: "13px",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                      <span style={{ color: "#888" }}>{m.courtName || "–"} · {formatDayKey(m.dayKey)}</span>
                      <span style={{ color: "#4FD1C5", fontWeight: 600 }}>{formatTime(m.finishedAt)}</span>
                    </div>
                    <div style={{ color: "#fff" }}>
                      {teamDisplay(m.team1PlayerIds)} <span style={{ color: "#666" }}>vs</span> {teamDisplay(m.team2PlayerIds)}
                    </div>
                    <div style={{ marginTop: "4px", color: "#9A9A9A" }}>
                      Skor {m.score1 ?? 0} – {m.score2 ?? 0}
                      {m.winner === "team1" && " · Pemenang: Team 1"}
                      {m.winner === "team2" && " · Pemenang: Team 2"}
                      {m.winner === "draw" && " · Seri"}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section style={{ marginBottom: "28px", padding: "16px", background: "#121212", borderRadius: "12px", border: "1px solid #222" }}>
              <h2 style={{ margin: "0 0 12px", fontSize: "14px", color: "#4FD1C5", letterSpacing: "0.05em" }}>PAIRING (siapa main dengan siapa)</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {pairingList.map((p, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #222" }}>
                    <span style={{ color: "#fff" }}>{p.names}</span>
                    <span style={{ color: "#4FD1C5" }}>{p.count}× main bersama</span>
                  </div>
                ))}
              </div>
            </section>

            <section style={{ marginBottom: "28px", padding: "16px", background: "#121212", borderRadius: "12px", border: "1px solid #222" }}>
              <h2 style={{ margin: "0 0 12px", fontSize: "14px", color: "#4FD1C5", letterSpacing: "0.05em" }}>TOP WINNING TEAMS</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {topTeams.map((t, i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #222" }}>
                    <span style={{ color: "#fff" }}>{i + 1}. {t.team}</span>
                    <span style={{ color: "#4FD1C5", fontWeight: 600 }}>{t.wins} menang</span>
                  </div>
                ))}
              </div>
            </section>

            <section style={{ marginBottom: "28px", padding: "16px", background: "#121212", borderRadius: "12px", border: "1px solid #222" }}>
              <h2 style={{ margin: "0 0 12px", fontSize: "14px", color: "#4FD1C5", letterSpacing: "0.05em" }}>TOP RANK PER ORANG</h2>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {topRank.map((r, i) => (
                  <div key={r.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid #222" }}>
                    <span style={{ color: "#fff" }}>{i + 1}. {r.name}</span>
                    <span style={{ color: "#4FD1C5", fontWeight: 600 }}>{r.wins} menang</span>
                  </div>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
}
