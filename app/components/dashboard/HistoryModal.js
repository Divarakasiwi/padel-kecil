"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../../firebase";

const PERIODS = [
  { value: "all", label: "Semua waktu" },
  { value: "month", label: "Bulan ini" },
  { value: "week", label: "Minggu ini" },
];

const MONTHS = "Jan Feb Mar Apr Mei Jun Jul Agt Sep Okt Nov Des".split(" ");

function getStartOfMonthISO() {
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function getStartOfWeekISO() {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function formatDateRange(period) {
  const now = new Date();
  if (period === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return `${start.getDate()} ${MONTHS[start.getMonth()]} – ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  }
  if (period === "week") {
    const start = new Date(now);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    start.setHours(0, 0, 0, 0);
    return `${start.getDate()} ${MONTHS[start.getMonth()]} – ${now.getDate()} ${MONTHS[now.getMonth()]} ${now.getFullYear()}`;
  }
  return null;
}

function teamKey(ids) {
  return [...(ids || [])].filter(Boolean).sort().join(",");
}

function teamDisplayName(ids, allPlayers) {
  const map = (allPlayers || []).reduce((acc, p) => {
    acc[p.id] = p.name || p.id;
    return acc;
  }, {});
  return (ids || []).map((id) => map[id] || id).join(" + ");
}

function processSnapshot(snap, allPlayers) {
  const wins = {};
  snap.docs.forEach((docSnap) => {
    const d = docSnap.data();
    const winner = d.winner;
    const t1 = d.team1PlayerIds || [];
    const t2 = d.team2PlayerIds || [];
    const k1 = teamKey(t1);
    const k2 = teamKey(t2);
    if (winner === "team1" && k1) {
      wins[k1] = (wins[k1] || 0) + 1;
    } else if (winner === "team2" && k2) {
      wins[k2] = (wins[k2] || 0) + 1;
    }
  });
  const list = Object.entries(wins)
    .map(([key, count]) => ({
      ids: key.split(","),
      wins: count,
    }))
    .sort((a, b) => b.wins - a.wins)
    .slice(0, 20)
    .map((item) => ({
      team: teamDisplayName(item.ids, allPlayers),
      wins: item.wins,
    }));
  return { list, totalMatches: snap.docs.length };
}

export default function HistoryModal({ open, onClose, allPlayers }) {
  const [period, setPeriod] = useState("all");
  const [loading, setLoading] = useState(true);
  const [topTeams, setTopTeams] = useState([]);
  const [totalMatches, setTotalMatches] = useState(0);
  const [error, setError] = useState(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!open) return;

    setLoading(true);
    setError(null);

    let q;
    if (period === "month") {
      const start = getStartOfMonthISO();
      q = query(
        collection(db, "matches"),
        where("finishedAt", ">=", start)
      );
    } else if (period === "week") {
      const start = getStartOfWeekISO();
      q = query(
        collection(db, "matches"),
        where("finishedAt", ">=", start)
      );
    } else {
      q = collection(db, "matches");
    }

    // Jangan pakai data dari cache dulu → hanya server. Mencegah "muncul hilang" setelah data match di Firestore dihapus.
    const fallbackTimer = setTimeout(() => {
      setLoading(false);
    }, 2500);

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        if (snap.metadata?.fromCache) return;
        clearTimeout(fallbackTimer);
        const { list, totalMatches: total } = processSnapshot(snap, allPlayers);
        setTopTeams(list);
        setTotalMatches(total);
        setError(null);
        setLoading(false);
      },
      (err) => {
        clearTimeout(fallbackTimer);
        setError("Gagal memuat riwayat.");
        setTopTeams([]);
        setTotalMatches(0);
        setLoading(false);
      }
    );

    return () => {
      clearTimeout(fallbackTimer);
      unsubscribe();
    };
  }, [open, period, allPlayers, retryCount]);

  if (!open) return null;

  const dateRangeLabel = formatDateRange(period);

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "max(24px, env(safe-area-inset-top))",
      }}
    >
      <div
        role="dialog"
        aria-label="Riwayat pertandingan"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#121212",
          borderRadius: "18px",
          border: "1px solid #333",
          maxWidth: "480px",
          width: "100%",
          maxHeight: "85vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 0 40px rgba(79,209,197,0.2)",
        }}
      >
        <div
          style={{
            padding: "20px 20px 12px",
            borderBottom: "1px solid #222",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "18px", color: "#E8FFF9" }}>
            Riwayat pertandingan
          </h2>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <Link
              href="/riwayat-detail"
              onClick={onClose}
              style={{
                background: "rgba(79,209,197,0.2)",
                border: "1px solid #4FD1C5",
                color: "#9FF5EA",
                padding: "8px 14px",
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "14px",
                fontWeight: 600,
                textDecoration: "none",
              }}
            >
              Lihat detail lengkap
            </Link>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "transparent",
                border: "1px solid #444",
                color: "#9FF5EA",
                padding: "8px 14px",
                borderRadius: "10px",
                cursor: "pointer",
                fontSize: "14px",
              }}
            >
              Tutup
            </button>
          </div>
        </div>

        <div style={{ padding: "16px 20px", borderBottom: "1px solid #222" }}>
          <label style={{ display: "block", marginBottom: "8px", color: "#9A9A9A", fontSize: "13px" }}>
            Periode
          </label>
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 14px",
              background: "#0B0B0B",
              border: "1px solid #333",
              borderRadius: "10px",
              color: "#fff",
              fontSize: "14px",
            }}
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          {dateRangeLabel && (
            <div style={{ marginTop: "8px", fontSize: "12px", color: "#666" }}>
              {dateRangeLabel}
            </div>
          )}
        </div>

        <div style={{ padding: "16px 20px", overflowY: "auto", flex: 1 }}>
          {loading && (
            <div style={{ padding: "16px 0" }}>
              <div style={{ height: 14, background: "#222", borderRadius: 4, marginBottom: 12, maxWidth: "80%" }} />
              <div style={{ height: 14, background: "#222", borderRadius: 4, marginBottom: 12, maxWidth: "60%" }} />
              <div style={{ height: 14, background: "#222", borderRadius: 4, marginBottom: 12, maxWidth: "70%" }} />
              <p style={{ color: "#9A9A9A", fontSize: "13px", marginTop: 16 }}>Memuat...</p>
            </div>
          )}
          {error && (
            <div style={{ textAlign: "center", padding: "24px" }}>
              <p style={{ color: "#FF6B6B", marginBottom: "16px" }}>{error}</p>
              <button
                type="button"
                onClick={() => { setError(null); setRetryCount((c) => c + 1); }}
                style={{
                  padding: "10px 20px",
                  background: "#4FD1C5",
                  border: "none",
                  borderRadius: "10px",
                  color: "#0B0B0B",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Coba lagi
              </button>
            </div>
          )}
          {!loading && !error && topTeams.length === 0 && (
            <div style={{ color: "#9A9A9A", textAlign: "center", padding: "24px" }}>
              Belum ada data pertandingan untuk periode ini.
            </div>
          )}
          {!loading && !error && topTeams.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
              <div
                style={{
                  fontSize: "12px",
                  color: "#9A9A9A",
                  marginBottom: "12px",
                }}
              >
                Berdasarkan {totalMatches} pertandingan
              </div>
              <div
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "#666",
                  marginBottom: "8px",
                  letterSpacing: "0.05em",
                }}
              >
                TOP WINNING TEAMS
              </div>
              {topTeams.map((t, i) => (
                <div
                  key={`${t.team}-${i}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 0",
                    borderBottom: "1px solid #222",
                  }}
                >
                  <span
                    style={{
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      maxWidth: "70%",
                      color: "#fff",
                    }}
                  >
                    {i + 1}. {t.team}
                  </span>
                  <span style={{ color: "#4FD1C5", fontWeight: 600 }}>
                    {t.wins} wins
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
