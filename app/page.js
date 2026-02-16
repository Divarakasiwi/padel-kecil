"use client";

import { collection, getDocs, addDoc } from "firebase/firestore";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { db } from "../firebase";

import {
  HOST_AUTH_KEY,
  getTodayKey,
  loadMatchQueue,
  saveMatchQueue,
  MATCH_QUEUE_KEY,
  initialCourtState,
} from "./lib/dashboard";

import Header from "./components/dashboard/Header";
import StatusIndicator from "./components/dashboard/StatusIndicator";
import BadgeManagerModal from "./components/dashboard/BadgeManagerModal";
import HistoryModal from "./components/dashboard/HistoryModal";
import ClaimHistoryModal from "./components/dashboard/ClaimHistoryModal";
import CourtCard from "./components/dashboard/CourtCard";
import InfoCard from "./components/dashboard/InfoCard";
import InfoRow from "./components/dashboard/InfoRow";

export default function Dashboard() {
  const router = useRouter();
  const [now, setNow] = useState(new Date());
  /* =====================
     COURT STATE
  ===================== */

  const storageDayKey = useMemo(() => getTodayKey(), []);
  const storageKey = useMemo(
    () => `padelkecil:courts:${storageDayKey}`,
    [storageDayKey]
  );

  const [court1, setCourt1] = useState(initialCourtState);
  const [extraCourts, setExtraCourts] = useState([]); // COURT 2–8
  const [mounted, setMounted] = useState(false);
  const [allPlayers, setAllPlayers] = useState([]);
  const [showBadgeManager, setShowBadgeManager] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showClaimHistoryModal, setShowClaimHistoryModal] = useState(false);
  const [toastMessage, setToastMessage] = useState("");

  // status kecil di pojok (online/offline/error/sync)
  const [systemStatus, setSystemStatus] = useState({
    level: "ok", // "ok" | "warning" | "error" | "syncing"
    message: "Semua sistem normal",
  });
  const [showStatusDetail, setShowStatusDetail] = useState(false);
  const [isSyncingMatches, setIsSyncingMatches] = useState(false);
  const [pendingMatchesCount, setPendingMatchesCount] = useState(0);

  // ====== CEK LOGIN HOST: redirect ke /host jika belum login ======
  const [hostChecked, setHostChecked] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!sessionStorage.getItem(HOST_AUTH_KEY)) {
      router.replace("/host");
      return;
    }
    setHostChecked(true);
  }, [router]);

  // ====== FUNGSI SYNC MATCH QUEUE KE FIRESTORE ======
  const trySyncMatchQueue = async () => {
    if (typeof window === "undefined") return;
    if (!navigator.onLine) return;

    const queue = loadMatchQueue();
    if (!queue.some((m) => !m.synced)) return;

    setIsSyncingMatches(true);
    setSystemStatus((prev) => ({
      ...prev,
      level: "syncing",
      message: "Menyinkronkan hasil match ke server...",
    }));

    let changed = false;

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.synced) continue;

      try {
        await addDoc(collection(db, "matches"), item.data);
        queue[i] = { ...item, synced: true };
        changed = true;
      } catch (e) {
        console.error("Gagal sync match ke server, akan dicoba lagi nanti", e);
        break;
      }
    }

    if (changed) {
      saveMatchQueue(queue);
    }

    // update jumlah pending
    setPendingMatchesCount(queue.filter((m) => !m.synced).length);

    setIsSyncingMatches(false);

    if (changed && navigator.onLine) {
      setToastMessage("Tersinkronkan");
      setTimeout(() => setToastMessage(""), 3000);
    }

    setSystemStatus((prev) => ({
      ...prev,
      level: navigator.onLine ? "ok" : "warning",
      message: navigator.onLine
        ? "Online – data match tersinkron dengan server."
        : "Match tetap tersimpan di perangkat; akan sync saat online.",
    }));
  };

useEffect(() => {
  setMounted(true);

  const t = setInterval(() => setNow(new Date()), 1000);
  return () => clearInterval(t);
}, []);

// ===== STATUS: ONLINE / OFFLINE DETECTION =====
useEffect(() => {
  if (typeof window === "undefined") return;

  const applyOnlineState = () => {
    setSystemStatus((prev) => ({
      ...prev,
      level: "ok",
      message: "Online – data siap disinkronkan ke server.",
    }));
    // saat kembali online, coba sync antrian match
    trySyncMatchQueue();
  };

  const applyOfflineState = () => {
    setSystemStatus((prev) => ({
      ...prev,
      level: "warning",
      message: "Match tetap tersimpan di perangkat; akan sync saat online.",
    }));
  };

  if (navigator.onLine) {
    applyOnlineState();
  } else {
    applyOfflineState();
  }

  window.addEventListener("online", applyOnlineState);
  window.addEventListener("offline", applyOfflineState);

  return () => {
    window.removeEventListener("online", applyOnlineState);
    window.removeEventListener("offline", applyOfflineState);
  };
}, []);

// ===== LOAD STATE COURT DARI STORAGE LOKAL (per hari) =====
useEffect(() => {
  try {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    if (parsed && parsed.court1) {
      setCourt1(parsed.court1);
    }
    if (parsed && Array.isArray(parsed.extraCourts)) {
      setExtraCourts(parsed.extraCourts);
    }
  } catch (e) {
    console.error("Gagal load state court dari storage", e);
  }
}, [storageKey]);

// ===== SIMPAN STATE COURT KE STORAGE LOKAL SETIAP PERUBAHAN =====
useEffect(() => {
  try {
    if (typeof window === "undefined") return;
    const raw = localStorage.getItem(storageKey);
    const base = raw ? JSON.parse(raw) : {};
    const next = {
      ...base,
      court1,
      extraCourts,
    };
    localStorage.setItem(storageKey, JSON.stringify(next));
  } catch (e) {
    console.error("Gagal simpan state court ke storage", e);
  }
}, [court1, extraCourts, storageKey]);

// ===== FETCH DAFTAR PEMAIN (untuk picker + kelola badge) =====
useEffect(() => {
  const fetchPlayers = async () => {
    try {
      const snap = await getDocs(collection(db, "players"));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAllPlayers(list);
    } catch (e) {
      console.error("Gagal fetch players", e);
    }
  };
  fetchPlayers();
}, []);

// ===== HANDLE FINISH MATCH: SIMPAN KE ANTRIAN MATCH =====
const handleMatchFinished = (result) => {
  const queue = loadMatchQueue();
  const item = {
    id: `${Date.now()}_${Math.random().toString(16).slice(2)}`,
    data: result,
    synced: false,
  };

  saveMatchQueue([...queue, item]);

  // update jumlah pending lokal
  setPendingMatchesCount(queue.filter((m) => !m.synced).length + 1);

  setToastMessage("Match tersimpan, menyinkronkan…");
  setTimeout(() => setToastMessage(""), 3000);

  setSystemStatus((prev) => ({
    ...prev,
    level: "syncing",
    message:
      "Hasil match tersimpan di perangkat dan sedang dikirim ke server (jika koneksi tersedia).",
  }));

  // coba sync langsung kalau online
  trySyncMatchQueue();
};

// ===== COURT MANAGEMENT (MULTI COURT) =====
const canAddMoreCourts = extraCourts.length < 7; // Court 1 + 7 = 8 total

const handleAddCourt = () => {
  if (!canAddMoreCourts) {
    alert("Maksimal 8 court per sesi.");
    return;
  }

  const nextIndex = extraCourts.length + 2; // COURT 2, 3, ...
  const id = `court-${nextIndex}`;

  setExtraCourts((prev) => [
    ...prev,
    {
      id,
      title: `COURT ${nextIndex}`,
      state: { ...initialCourtState },
    },
  ]);
};

const handleRemoveCourt = (id) => {
  setExtraCourts((prev) =>
    prev.filter((court) => {
      if (court.id !== id) return true;
      const s = court.state;
      const isEmpty =
        s.team1.length === 0 && s.team2.length === 0 && !s.finished;
      // hanya hapus jika kosong & tidak finished
      return !isEmpty;
    })
  );
};

const updateExtraCourtState = (id, updater) => {
  setExtraCourts((prev) =>
    prev.map((court) =>
      court.id === id
        ? {
            ...court,
            state: typeof updater === "function" ? updater(court.state) : updater,
          }
        : court
    )
  );
};

  /* =====================
     DATA RINGAN (HOST)
  ===================== */

  // Player Priority: hanya yang sudah selesai minimal 1 match hari ini; urut yang paling sedikit main
  const players = useMemo(() => {
    const today = getTodayKey();
    const queue = loadMatchQueue();
    const todayMatches = queue.filter((item) => item.data?.dayKey === today);
    const countById = {};
    const scannedTodayIds = new Set();
    todayMatches.forEach((item) => {
      const d = item.data;
      if (!d) return;
      const ids = [...(d.team1PlayerIds || []), ...(d.team2PlayerIds || [])];
      ids.forEach((id) => {
        countById[id] = (countById[id] || 0) + 1;
        scannedTodayIds.add(id);
      });
    });
    return allPlayers
      .filter((p) => scannedTodayIds.has(p.id))
      .map((p) => ({ id: p.id, name: p.name || p.id, played: countById[p.id] || 0 }))
      .sort((a, b) => a.played - b.played);
  }, [allPlayers, pendingMatchesCount]);

  // Pairing Insight: pasangan yang main bersama hari ini (dari semua court), digabung
  const pairings = useMemo(() => {
    const today = getTodayKey();
    const queue = loadMatchQueue();
    const todayMatches = queue.filter((item) => item.data?.dayKey === today);
    const countByPairKey = {};
    todayMatches.forEach((item) => {
      const d = item.data;
      if (!d) return;
      const t1 = d.team1PlayerIds || [];
      const t2 = d.team2PlayerIds || [];
      if (t1.length === 2) {
        const key = [...t1].sort().join(",");
        countByPairKey[key] = (countByPairKey[key] || 0) + 1;
      }
      if (t2.length === 2) {
        const key = [...t2].sort().join(",");
        countByPairKey[key] = (countByPairKey[key] || 0) + 1;
      }
    });
    const nameById = (allPlayers || []).reduce((acc, p) => {
      acc[p.id] = p.name || p.id;
      return acc;
    }, {});
    return Object.entries(countByPairKey)
      .map(([key, times]) => {
        const ids = key.split(",");
        const names = ids.map((id) => nameById[id] || id);
        return { pair: names.join(" + "), times };
      })
      .sort((a, b) => b.times - a.times);
  }, [allPlayers, pendingMatchesCount]);

  // Top 3 pemain (hari ini) berdasarkan jumlah kemenangan individu
  const topWinnersToday = useMemo(() => {
    const today = getTodayKey();
    const queue = loadMatchQueue();
    const todayMatches = queue.filter((item) => item.data?.dayKey === today);
    const winsById = {};
    todayMatches.forEach((item) => {
      const d = item.data;
      if (!d) return;
      const winner = d.winner;
      const t1 = d.team1PlayerIds || [];
      const t2 = d.team2PlayerIds || [];
      if (winner === "team1") {
        t1.forEach((id) => { winsById[id] = (winsById[id] || 0) + 1; });
      } else if (winner === "team2") {
        t2.forEach((id) => { winsById[id] = (winsById[id] || 0) + 1; });
      }
    });
    const nameById = (allPlayers || []).reduce((acc, p) => {
      acc[p.id] = p.name || p.id;
      return acc;
    }, {});
    return Object.entries(winsById)
      .map(([id, wins]) => ({ id, name: nameById[id] || id, wins }))
      .sort((a, b) => b.wins - a.wins)
      .slice(0, 3);
  }, [allPlayers, pendingMatchesCount]);

  if (!hostChecked) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0B0B0B",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#4FD1C5",
          fontSize: "14px",
        }}
      >
        Memeriksa akses...
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
        fontFamily: "Inter, system-ui, Arial, sans-serif",
        position: "relative",
      }}
    >
      {/* HEADER */}
      <Header
        now={now}
        mounted={mounted}
        onOpenBadgeManager={() => setShowBadgeManager(true)}
      />

      {/* MODAL KELOLA BADGE */}
      {showBadgeManager && (
        <BadgeManagerModal
          allPlayers={allPlayers}
          onRefresh={() => {
            getDocs(collection(db, "players")).then((snap) => {
              setAllPlayers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            });
          }}
          onClose={() => setShowBadgeManager(false)}
        />
      )}

      {/* STATUS INDICATOR KECIL DI POJOK */}
      <StatusIndicator
        status={systemStatus}
        showDetail={showStatusDetail}
        onToggleDetail={() => setShowStatusDetail((v) => !v)}
        pendingCount={pendingMatchesCount}
      />

      {/* TOAST: feedback sync match */}
      {toastMessage && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            left: "50%",
            transform: "translateX(-50%)",
            bottom: "max(80px, calc(env(safe-area-inset-bottom) + 56px))",
            zIndex: 101,
            padding: "12px 20px",
            background: "#121212",
            border: "1px solid #4FD1C5",
            borderRadius: "12px",
            color: "#9FF5EA",
            fontSize: "14px",
            boxShadow: "0 0 20px rgba(79,209,197,0.3)",
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* TAGLINE – di atas kiri Court 1 */}
      <div
        style={{
          marginBottom: "12px",
          fontSize: "clamp(11px, 2vw, 13px)",
          fontWeight: 400,
          letterSpacing: "0.2em",
          color: "rgba(159,245,234,0.6)",
        }}
      >
        match & community
      </div>

      {/* COURTS – HORIZONTAL SCROLL */}
      <div
        style={{
          position: "relative",
          marginBottom: "32px",
          overflowX: "hidden",
        }}
      >
        <div
          className="court-scroll"
          style={{
            display: "flex",
            flexWrap: "nowrap",
            gap: "20px",
            overflowX: "auto",
            paddingBottom: "4px",
          }}
        >
          {/* COURT 1 (FIXED) */}
          <div
            style={{
              position: "relative",
              minWidth: "min(640px, 70vw)",
              maxWidth: "min(640px, 70vw)",
              flex: "0 0 min(640px, 70vw)",
            }}
          >
            <CourtCard
              title="COURT 1"
              court={court1}
              setCourt={setCourt1}
              initialCourt={initialCourtState}
              reportStatus={setSystemStatus}
              onMatchFinished={handleMatchFinished}
              allPlayers={allPlayers}
            />
          </div>

          {/* EXTRA COURTS */}
          {extraCourts.map((court) => (
            <div
              key={court.id}
              style={{
                position: "relative",
                minWidth: "min(640px, 70vw)",
                maxWidth: "min(640px, 70vw)",
                flex: "0 0 min(640px, 70vw)",
              }}
            >
              {/* Tombol X hapus court (hanya jika kosong & tidak finished) akan dicek di handler */}
              <button
                onClick={() => handleRemoveCourt(court.id)}
                title="Hapus court (hanya jika kosong & tidak aktif)"
                style={{
                  position: "absolute",
                  top: 8,
                  right: 8,
                  zIndex: 10,
                  width: 44,
                  height: 44,
                  minWidth: 44,
                  minHeight: 44,
                  borderRadius: "999px",
                  border: "1px solid #553333",
                  background: "rgba(26,15,15,0.9)",
                  color: "#FF6B6B",
                  fontSize: 18,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 0,
                }}
              >
                ×
              </button>

              <CourtCard
                title={court.title}
                court={court.state}
                setCourt={(updater) =>
                  updateExtraCourtState(court.id, updater)
                }
                initialCourt={initialCourtState}
                reportStatus={setSystemStatus}
                onMatchFinished={handleMatchFinished}
                allPlayers={allPlayers}
              />
            </div>
          ))}

          {/* ADD COURT PLACEHOLDER */}
          <div
            style={{
              minWidth: "min(640px, 70vw)",
              maxWidth: "min(640px, 70vw)",
              flex: "0 0 min(640px, 70vw)",
              background: "#0B0B0B",
              borderRadius: "18px",
              border: "2px dashed #4FD1C5",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              minHeight: "320px",
              cursor: canAddMoreCourts ? "pointer" : "not-allowed",
              boxShadow: `
                0 0 12px rgba(79,209,197,0.4),
                inset 0 0 18px rgba(79,209,197,0.25)
              `,
              transition: "all 0.25s ease",
              opacity: canAddMoreCourts ? 1 : 0.4,
            }}
            onClick={canAddMoreCourts ? handleAddCourt : undefined}
            onMouseEnter={(e) => {
              if (!canAddMoreCourts) return;
              e.currentTarget.style.boxShadow =
                "0 0 22px rgba(79,209,197,0.8), inset 0 0 26px rgba(79,209,197,0.45)";
            }}
            onMouseLeave={(e) => {
              if (!canAddMoreCourts) return;
              e.currentTarget.style.boxShadow =
                "0 0 12px rgba(79,209,197,0.4), inset 0 0 18px rgba(79,209,197,0.25)";
            }}
          >
            <div
              style={{
                fontSize: "64px",
                fontWeight: 700,
                color: "#4FD1C5",
                textShadow: "0 0 18px rgba(79,209,197,0.9)",
                userSelect: "none",
              }}
            >
              +
            </div>
          </div>
        </div>

        {/* VISUAL HINT: GRADIENT DI SISI KANAN */}
        <div
          style={{
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 12,
            width: 40,
            pointerEvents: "none",
            background:
              extraCourts.length >= 0
                ? "linear-gradient(to left, #0B0B0B, transparent)"
                : "none",
          }}
        />
      </div>

      

      {/* INFO */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          marginBottom: "32px",
        }}
      >
        {/* PLAYER PRIORITY */}
        <InfoCard title="PLAYER PRIORITY (HOST)">
          {players.length === 0 ? (
            <div style={{ padding: "12px 0", color: "#9A9A9A", fontSize: "14px" }}>
              Belum ada pemain terdaftar.
            </div>
          ) : (
            players.map((p, index) => (
              <InfoRow
                key={p.id}
                left={p.name}
                right={`${p.played}x`}
                badge={index === 0 ? "recommended" : null}
              />
            ))
          )}
        </InfoCard>

        {/* PAIRING INSIGHT – dari semua court hari ini */}
        <InfoCard title="PAIRING INSIGHT (HOST)">
          {pairings.length === 0 ? (
            <div style={{ padding: "12px 0", color: "#9A9A9A", fontSize: "14px" }}>
              Belum ada pasangan hari ini.
            </div>
          ) : (
            pairings.map((p) => (
              <InfoRow
                key={p.pair}
                left={p.pair}
                right={`${p.times}x`}
                badge={p.times >= 3 ? "often" : null}
              />
            ))
          )}
        </InfoCard>
      </div>

      {/* TOP 3 PEMENANG HARI INI (per pemain) */}
      <InfoCard title="JUARA 1, 2, 3 (HARI INI)">
        {topWinnersToday.length === 0 ? (
          <div style={{ padding: "12px 0", color: "#9A9A9A", fontSize: "14px" }}>
            Belum ada pertandingan selesai hari ini.
          </div>
        ) : (
          topWinnersToday.map((p, i) => (
            <InfoRow
              key={p.id}
              left={`${i + 1}. ${p.name}`}
              right={`${p.wins} wins`}
            />
          ))
        )}
      </InfoCard>

      {/* RIWAYAT PERTANDINGAN */}
      <div style={{ marginTop: "24px" }}>
        <button
          type="button"
          onClick={() => setShowHistoryModal(true)}
          style={{
            width: "100%",
            minHeight: "48px",
            padding: "16px 20px",
            background: "transparent",
            border: "1px solid #333",
            borderRadius: "14px",
            color: "#9FF5EA",
            fontSize: "15px",
            fontWeight: 500,
            cursor: "pointer",
            letterSpacing: "0.04em",
          }}
        >
          Riwayat pertandingan
        </button>
      </div>

      {/* RIWAYAT CLAIM MINUMAN */}
      <div style={{ marginTop: "12px", marginBottom: "32px" }}>
        <button
          type="button"
          onClick={() => setShowClaimHistoryModal(true)}
          style={{
            width: "100%",
            minHeight: "48px",
            padding: "16px 20px",
            background: "transparent",
            border: "1px solid #333",
            borderRadius: "14px",
            color: "#9FF5EA",
            fontSize: "15px",
            fontWeight: 500,
            cursor: "pointer",
            letterSpacing: "0.04em",
          }}
        >
          Riwayat claim minuman
        </button>
      </div>

      {showHistoryModal && (
        <HistoryModal
          open={showHistoryModal}
          onClose={() => setShowHistoryModal(false)}
          allPlayers={allPlayers}
        />
      )}
      {showClaimHistoryModal && (
        <ClaimHistoryModal
          open={showClaimHistoryModal}
          onClose={() => setShowClaimHistoryModal(false)}
        />
      )}

      {/* TOMBOL CARA PAKAI – pojok kiri bawah, ? dalam lingkaran + glow → ke halaman /cara-pakai */}
      <Link
        href="/cara-pakai"
        aria-label="Cara pakai"
        style={{
          position: "fixed",
          left: "max(16px, env(safe-area-inset-left))",
          bottom: "max(16px, env(safe-area-inset-bottom))",
          zIndex: 99,
          width: "48px",
          height: "48px",
          borderRadius: "50%",
          border: "1px solid rgba(79,209,197,0.5)",
          background: "#121212",
          color: "#9FF5EA",
          fontSize: "22px",
          fontWeight: 700,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 20px rgba(79,209,197,0.4), 0 0 40px rgba(79,209,197,0.2)",
          textDecoration: "none",
        }}
      >
        ?
      </Link>
    </div>
  );
}

