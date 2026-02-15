"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "../../../firebase";

/**
 * Struktur data di Firestore collection "drinkClaims":
 * - playerId: string
 * - playerName: string
 * - dayKey: string (YYYY-MM-DD, tanggal klaim)
 * - claimedAt: string (ISO timestamp)
 * (photoUrl opsional, untuk tampilan nanti)
 */

function formatDayKey(dayKey) {
  if (!dayKey || dayKey.length < 10) return dayKey;
  const [y, m, d] = dayKey.split("-");
  const months = "Jan Feb Mar Apr Mei Jun Jul Agt Sep Okt Nov Des".split(" ");
  const mi = parseInt(m, 10) - 1;
  return `${d} ${months[mi]} ${y}`;
}

export default function ClaimHistoryModal({ open, onClose }) {
  const today = (() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  })();

  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [loading, setLoading] = useState(false);
  const [claims, setClaims] = useState([]);
  const [error, setError] = useState(null);
  const [todayCount, setTodayCount] = useState(null);

  // Fetch today's count when modal opens
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setError(null);
    const q = query(
      collection(db, "drinkClaims"),
      where("dayKey", "==", today)
    );
    getDocs(q)
      .then((snap) => {
        if (!cancelled) setTodayCount(snap.size);
      })
      .catch(() => {
        if (!cancelled) setTodayCount(0);
      });
    return () => { cancelled = true; };
  }, [open, today]);

  // Fetch range when dates change or modal opens
  useEffect(() => {
    if (!open) return;
    if (dateFrom > dateTo) {
      setClaims([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    const q = query(
      collection(db, "drinkClaims"),
      where("dayKey", ">=", dateFrom),
      where("dayKey", "<=", dateTo),
      orderBy("dayKey", "desc")
    );
    getDocs(q)
      .then((snap) => {
        if (cancelled) return;
        const list = snap.docs
          .map((doc) => ({ id: doc.id, ...doc.data() }))
          .sort((a, b) => (b.claimedAt || "").localeCompare(a.claimedAt || ""));
        setClaims(list);
      })
      .catch((e) => {
        if (!cancelled) {
          setError("Gagal memuat riwayat claim.");
          setClaims([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [open, dateFrom, dateTo]);

  if (!open) return null;

  const totalInRange = claims.length;
  const groupedByDay = claims.reduce((acc, c) => {
    const d = c.dayKey || "";
    if (!acc[d]) acc[d] = [];
    acc[d].push(c);
    return acc;
  }, {});
  const sortedDays = Object.keys(groupedByDay).sort().reverse();

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
        padding: "max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))",
        boxSizing: "border-box",
      }}
    >
      <div
        role="dialog"
        aria-label="Riwayat claim minuman"
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#121212",
          borderRadius: "16px",
          border: "1px solid #333",
          maxWidth: "480px",
          width: "100%",
          maxHeight: "min(82vh, calc(100vh - 32px))",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 0 40px rgba(79,209,197,0.2)",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            padding: "14px 16px 10px",
            borderBottom: "1px solid #222",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexShrink: 0,
          }}
        >
          <h2 style={{ margin: 0, fontSize: "16px", color: "#E8FFF9" }}>
            Riwayat claim minuman
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid #444",
              color: "#9FF5EA",
              padding: "6px 12px",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            Tutup
          </button>
        </div>

        <div style={{ padding: "10px 16px", borderBottom: "1px solid #222", flexShrink: 0 }}>
          <div style={{ fontSize: "12px", color: "#4FD1C5", marginBottom: "6px" }}>
            Klaim hari ini: <strong>{todayCount != null ? todayCount : "–"}</strong>
          </div>
          <p style={{ fontSize: "10px", color: "#666", marginBottom: "6px" }}>
            Ketuk untuk memilih tanggal (kalender akan muncul)
          </p>
          <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
            <label htmlFor="claim-date-from" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px", cursor: "pointer", minWidth: 0 }}>
              <span style={{ color: "#9A9A9A", fontSize: "11px" }}>Dari</span>
              <input
                id="claim-date-from"
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                style={{
                  width: "100%",
                  minHeight: "32px",
                  padding: "6px 8px",
                  background: "#0B0B0B",
                  border: "1px solid #333",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "13px",
                  cursor: "pointer",
                  boxSizing: "border-box",
                }}
              />
            </label>
            <label htmlFor="claim-date-to" style={{ flex: 1, display: "flex", flexDirection: "column", gap: "2px", cursor: "pointer", minWidth: 0 }}>
              <span style={{ color: "#9A9A9A", fontSize: "11px" }}>Sampai</span>
              <input
                id="claim-date-to"
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                style={{
                  width: "100%",
                  minHeight: "32px",
                  padding: "6px 8px",
                  background: "#0B0B0B",
                  border: "1px solid #333",
                  borderRadius: "8px",
                  color: "#fff",
                  fontSize: "13px",
                  cursor: "pointer",
                  boxSizing: "border-box",
                }}
              />
            </label>
          </div>
        </div>

        <div style={{ padding: "12px 16px", overflowY: "auto", flex: 1, minHeight: 0 }}>
          {error && (
            <div style={{ color: "#FF6B6B", marginBottom: "12px" }}>{error}</div>
          )}
          {loading && (
            <div style={{ color: "#9FF5EA", textAlign: "center", padding: "24px" }}>
              Memuat...
            </div>
          )}
          {!loading && dateFrom > dateTo && (
            <div style={{ color: "#9A9A9A", padding: "8px 0", fontSize: "13px" }}>
              Pilih rentang tanggal yang valid.
            </div>
          )}
          {!loading && !error && dateFrom <= dateTo && claims.length === 0 && (
            <div style={{ color: "#9A9A9A", padding: "8px 0", fontSize: "13px" }}>
              Tidak ada data claim untuk rentang ini.
            </div>
          )}
          {!loading && !error && sortedDays.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div style={{ fontSize: "12px", color: "#9A9A9A" }}>
                Total dalam rentang: <strong style={{ color: "#fff" }}>{totalInRange}</strong> klaim
              </div>
              {sortedDays.map((dayKey) => (
                <div key={dayKey}>
                  <div
                    style={{
                      fontSize: "11px",
                      fontWeight: 600,
                      color: "#666",
                      marginBottom: "8px",
                      letterSpacing: "0.05em",
                    }}
                  >
                    {formatDayKey(dayKey)} — {groupedByDay[dayKey].length} klaim
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                    {groupedByDay[dayKey].map((c) => (
                      <div
                        key={c.id}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          padding: "10px 12px",
                          background: "#0B0B0B",
                          borderRadius: "10px",
                          border: "1px solid #222",
                        }}
                      >
                        <span style={{ color: "#fff" }}>{c.playerName || c.playerId}</span>
                        <span style={{ fontSize: "12px", color: "#666" }}>
                          {c.claimedAt
                            ? new Date(c.claimedAt).toLocaleTimeString("id-ID", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
