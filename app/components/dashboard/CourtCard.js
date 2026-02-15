"use client";

import { useState, useRef, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { getTodayKey, initialCourtState, SLOT_ORDER, SLOT_COLORS } from "../../lib/dashboard";

function TeamColumn({
  title,
  players,
  teamKey,
  color,
  onSelect,
  isFinished,
  onEmptySlotClick,
}) {
  const MAX_PLAYER = 2;
  const emptyCount = Math.max(0, MAX_PLAYER - players.length);

  return (
    <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: "11px", fontWeight: 600, color: "#666", marginBottom: "8px", letterSpacing: "0.05em" }}>
        {title}
      </div>
      <div style={{ display: "grid", gap: "10px", flex: 1 }}>
        {players.map((p) => {
          const slotColor = p.slot ? SLOT_COLORS[p.slot] : null;
          return (
            <div
              key={p.id}
              onClick={() => {
                if (isFinished) return;
                onSelect?.(p);
              }}
              style={{
                background: slotColor ? slotColor.bg : "#0B0B0B",
                padding: "16px",
                borderRadius: "14px",
                textAlign: "center",
                fontWeight: 600,
                color: slotColor ? slotColor.text : color,
                border: slotColor ? `1px solid ${slotColor.border}` : "1px solid #111",
                cursor: "pointer",
                minHeight: "72px",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-start",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, width: "100%" }}>
                {p.photoUrl && (
                  <img
                    src={p.photoUrl || "/avatar-placeholder.png"}
                    alt={p.name}
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      objectFit: "cover",
                      background: "#222",
                      overflow: "hidden",
                    }}
                  />
                )}
                <div>
                  <div>{p.name}</div>
                  {p.badge === "queen" && (
                    <div className="queen-badge" style={{ marginTop: 2 }}>👑 QUEEN</div>
                  )}
                  {p.isVIP && (
                    <div className="vip-badge-slot">⭐ VIP</div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        {Array.from({ length: emptyCount }).map((_, i) => (
          <div
            key={`empty-${i}`}
            onClick={() => onEmptySlotClick(teamKey, players.length + i)}
            style={{
              padding: "16px",
              borderRadius: "14px",
              textAlign: "center",
              color: "#777",
              border: "2px dashed #444",
              cursor: "pointer",
              minHeight: "72px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            + SLOT KOSONG
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CourtCard({
  title,
  court,
  setCourt,
  initialCourt,
  reportStatus,
  onMatchFinished,
  allPlayers = [],
}) {
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);
  const [activePlayer, setActivePlayer] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);

  const slotTargetRef = useRef(null);
  const qrRef = useRef(null);
  const scanTargetRef = useRef(null);
  const activePlayerIdsRef = useRef(new Set());
  const qrContainerIdRef = useRef(`qr-${title.replace(/\s/g, "-")}-${Date.now()}`).current;

  const addTestPlayer = () => {
    if (court.team1.length >= 2) return;
    const player = {
      id: `test_${Date.now()}`,
      name: "Willy (TEST)",
      photoUrl: "",
      isVIP: true,
      slot: SLOT_ORDER[court.team1.length],
    };
    setCourt((prev) => ({ ...prev, team1: [...prev.team1, player] }));
  };

  const openScannerForSlot = (teamKey, slotIndex) => {
    scanTargetRef.current = { teamKey, slotIndex };
    setShowScanner(true);
  };

  const openPlayerPicker = (teamKey, slotIndex) => {
    slotTargetRef.current = { teamKey, slotIndex };
    setShowPlayerPicker(true);
  };

  useEffect(() => {
    const ids = new Set();
    court.team1.forEach((p) => ids.add(p.id));
    court.team2.forEach((p) => ids.add(p.id));
    activePlayerIdsRef.current = ids;
  }, [court.team1, court.team2]);

  useEffect(() => {
    if (!showScanner || !scanTargetRef.current) return;
    let isCancelled = false;

    const startScan = async () => {
      try {
        const target = scanTargetRef.current;
        if (!target) return;

        if (!qrRef.current) {
          qrRef.current = new Html5Qrcode(qrContainerIdRef);
        }

        await qrRef.current.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 250 },
          async (decodedText) => {
            if (isCancelled) return;
            const playerId = decodedText.trim();

            if (activePlayerIdsRef.current.has(playerId)) {
              alert("Player ini sedang bermain di tempat lain");
              if (qrRef.current) {
                try { await qrRef.current.stop(); } catch (e) {}
                try { await qrRef.current.clear(); } catch (e) {}
                qrRef.current = null;
              }
              setShowScanner(false);
              scanTargetRef.current = null;
              reportStatus?.({ level: "warning", message: "Player sudah aktif di court ini. Gunakan menu Player Action jika ingin memindahkan atau mengeluarkan pemain." });
              return;
            }

            const playerRef = doc(db, "players", playerId);
            const snap = await getDoc(playerRef);

            if (!snap.exists()) {
              alert("Player tidak ditemukan");
              if (qrRef.current) {
                try { await qrRef.current.stop(); } catch (e) {}
                try { await qrRef.current.clear(); } catch (e) {}
                qrRef.current = null;
              }
              setShowScanner(false);
              scanTargetRef.current = null;
              reportStatus?.({ level: "warning", message: "QR tidak cocok dengan data player di server. Pastikan QR sesuai dengan data registrasi." });
              return;
            }

            setCourt((prev) => {
              if (prev[target.teamKey].length >= 2) {
                alert("Tim ini sudah penuh");
                return prev;
              }
              return {
                ...prev,
                [target.teamKey]: [
                  ...prev[target.teamKey],
                  {
                    id: playerId,
                    name: snap.data().name,
                    isVIP: snap.data().isVIP || false,
                    photoUrl: snap.data().photoUrl || "",
                    badge: snap.data().badge || null,
                    slot: SLOT_ORDER[target.slotIndex],
                  },
                ],
              };
            });

            activePlayerIdsRef.current.add(playerId);
            if (qrRef.current) {
              try { await qrRef.current.stop(); } catch (e) {}
              try { await qrRef.current.clear(); } catch (e) {}
              qrRef.current = null;
            }
            setShowScanner(false);
            scanTargetRef.current = null;
            reportStatus?.({ level: "ok", message: "Scanner berjalan normal dan pemain berhasil ditambahkan." });
          }
        );
      } catch (e) {
        console.error(e);
        reportStatus?.({ level: "error", message: "Scanner mengalami error. Jika masalah berlanjut, silakan refresh – data match aman karena tersimpan di perangkat." });
      }
    };

    startScan();
    return () => {
      isCancelled = true;
      if (qrRef.current) {
        try { qrRef.current.stop(); } catch (e) {}
        try { qrRef.current.clear(); } catch (e) {}
        qrRef.current = null;
      }
    };
  }, [showScanner, reportStatus, setCourt]);

  const isFinished = court.finished;
  const totalScore = court.score1 + court.score2;
  const isMaxScore = totalScore >= 21;
  const canAdd = !isFinished && !isMaxScore;
  const canFinish = totalScore === 21 && !isFinished;
  const winner = isFinished
    ? court.score1 > court.score2 ? "team1" : court.score2 > court.score1 ? "team2" : null
    : null;

  const addTeam1 = () => {
    if (!isFinished && !isMaxScore) setCourt((prev) => ({ ...prev, score1: prev.score1 + 1 }));
  };
  const addTeam2 = () => {
    if (!isFinished && !isMaxScore) setCourt((prev) => ({ ...prev, score2: prev.score2 + 1 }));
  };
  const reduceTeam1 = () => {
    if (!isFinished && court.score1 > 0) setCourt((prev) => ({ ...prev, score1: prev.score1 - 1 }));
  };
  const reduceTeam2 = () => {
    if (!isFinished && court.score2 > 0) setCourt((prev) => ({ ...prev, score2: prev.score2 - 1 }));
  };

  const needsAttention = isFinished;

  const performFinishMatch = async () => {
    if (qrRef.current) {
      try { await qrRef.current.stop(); } catch (e) {}
      try { await qrRef.current.clear(); } catch (e) {}
      qrRef.current = null;
    }
    scanTargetRef.current = null;
    slotTargetRef.current = null;
    setActivePlayer(null);
    setShowScanner(false);
    setShowPlayerPicker(false);
    setCourt((prev) => ({ ...prev, finished: true }));

    if (typeof window !== "undefined") {
      const result = {
        dayKey: getTodayKey(),
        finishedAt: new Date().toISOString(),
        courtName: title,
        score1: court.score1,
        score2: court.score2,
        winner: court.score1 > court.score2 ? "team1" : court.score2 > court.score1 ? "team2" : "draw",
        team1PlayerIds: court.team1.map((p) => p.id),
        team2PlayerIds: court.team2.map((p) => p.id),
      };
      reportStatus?.({ level: "syncing", message: "Hasil match tersimpan di perangkat dan sedang dikirim ke server (jika koneksi tersedia)." });
      onMatchFinished?.(result);
    }
  };

  const resetCourt = () => {
    activePlayerIdsRef.current.clear();
    slotTargetRef.current = null;
    scanTargetRef.current = null;
    setActivePlayer(null);
    setShowScanner(false);
    setShowPlayerPicker(false);
    setCourt({ ...(initialCourt || initialCourtState) });
  };

  return (
    <div
      style={{
        background: "#121212",
        borderRadius: "18px",
        padding: "20px",
        border: needsAttention ? "1px solid #D6C7A1" : "1px solid #222",
        position: "relative",
        overflow: "hidden",
        boxShadow: needsAttention ? "0 0 18px rgba(214,199,161,0.45)" : "0 0 10px rgba(0,0,0,0.6)",
        transition: "box-shadow 0.2s ease, border-color 0.2s ease",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}>
        <strong>{title}</strong>
        <span style={{ fontSize: "12px", color: isFinished ? "#D6C7A1" : "#4FD1C5" }}>
          {isFinished ? "FINISHED" : "ONGOING"}
        </span>
      </div>

      <button
        onClick={addTestPlayer}
        style={{
          width: "100%",
          marginBottom: 14,
          padding: "10px",
          borderRadius: 12,
          background: "#0B1F1E",
          color: "#4FD1C5",
          border: "1px dashed #4FD1C5",
          cursor: "pointer",
        }}
      >
        + TEST PLAYER
      </button>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px", minWidth: 0 }}>
        <TeamColumn
          title="TEAM 1"
          teamKey="team1"
          players={court.team1}
          color="#4FD1C5"
          onSelect={(player) => setActivePlayer({ player, fromTeam: "team1" })}
          isFinished={isFinished}
          onEmptySlotClick={openScannerForSlot}
        />
        <TeamColumn
          title="TEAM 2"
          teamKey="team2"
          players={court.team2}
          color="#D6C7A1"
          onSelect={(player) => setActivePlayer({ player, fromTeam: "team2" })}
          isFinished={isFinished}
          onEmptySlotClick={openScannerForSlot}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", alignItems: "center", minWidth: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          <div onClick={addTeam1} style={{ fontSize: "38px", fontWeight: 700, color: canAdd ? "#4FD1C5" : "#555", cursor: canAdd ? "pointer" : "not-allowed" }}>
            {court.score1}
          </div>
          <button onClick={reduceTeam1} disabled={court.score1 === 0 || isFinished} style={{ padding: "8px 16px", fontSize: "14px", minWidth: "48px", minHeight: "40px", borderRadius: "10px", border: "1px solid #4FD1C555", background: "#0B0B0B", color: "#4FD1C5", cursor: "pointer" }}>
            −
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          <div onClick={addTeam2} style={{ fontSize: "38px", fontWeight: 700, color: canAdd ? "#D6C7A1" : "#555", cursor: canAdd ? "pointer" : "not-allowed" }}>
            {court.score2}
          </div>
          <button onClick={reduceTeam2} disabled={court.score2 === 0 || isFinished} style={{ padding: "8px 16px", fontSize: "14px", minWidth: "48px", minHeight: "40px", borderRadius: "10px", border: "1px solid #D6C7A1", background: "#0B0B0B", color: "#D6C7A1", cursor: "pointer" }}>
            −
          </button>
        </div>
      </div>

      <div style={{ textAlign: "center", fontSize: "12px", color: "#777", margin: "14px 0 10px" }}>
        total: {totalScore} / 21
      </div>

      {activePlayer && (
        <div style={{ marginTop: "18px", padding: "16px", borderRadius: "16px", background: "#111", border: "1px solid #2A2A2A", display: "grid", gap: "12px" }}>
          <div style={{ fontSize: "13px", fontWeight: 600, color: "#AAA", marginBottom: "4px" }}>Player Action</div>
          <button
            onClick={() => {
              const from = activePlayer.fromTeam;
              const to = from === "team1" ? "team2" : "team1";
              setCourt((prev) => {
                const movingPlayer = prev[from].find((p) => p.id === activePlayer.player.id);
                if (!movingPlayer) return prev;
                return {
                  ...prev,
                  [from]: prev[from].filter((p) => p.id !== movingPlayer.id).map((p, i) => ({ ...p, slot: SLOT_ORDER[i] })),
                  [to]: [...prev[to], movingPlayer].map((p, i) => ({ ...p, slot: SLOT_ORDER[i] })),
                };
              });
              setActivePlayer(null);
            }}
            style={{ height: "52px", borderRadius: "14px", border: "1px solid #4FD1C555", background: "#0B1F1E", color: "#4FD1C5", fontSize: "15px", fontWeight: 600, cursor: "pointer" }}
          >
            Pindah ke tim lain
          </button>
          <button
            onClick={() => {
              const from = activePlayer.fromTeam;
              setCourt((prev) => ({
                ...prev,
                [from]: prev[from].filter((p) => p.id !== activePlayer.player.id).map((p, i) => ({ ...p, slot: SLOT_ORDER[i] })),
              }));
              activePlayerIdsRef.current.delete(activePlayer.player.id);
              setActivePlayer(null);
            }}
            style={{ height: "52px", borderRadius: "14px", border: "1px solid #553333", background: "#1A0F0F", color: "#FF8A8A", fontSize: "15px", fontWeight: 600, cursor: "pointer" }}
          >
            Keluarkan pemain
          </button>
          <button
            onClick={async () => {
              if (qrRef.current) { try { await qrRef.current.stop(); } catch (e) {} try { qrRef.current.clear(); } catch (e) {} qrRef.current = null; }
              scanTargetRef.current = null;
              setShowScanner(false);
            }}
            style={{ padding: "10px", background: "#222", color: "#888", borderRadius: "10px", cursor: "pointer" }}
          >
            Batal
          </button>
        </div>
      )}

      <button
        disabled={!canFinish}
        onClick={() => canFinish && setShowFinishConfirm(true)}
        style={{ width: "100%", padding: "14px", borderRadius: "12px", border: "1px solid #333", background: canFinish ? "#1F1F1F" : "#0E0E0E", color: canFinish ? "#fff" : "#444", cursor: canFinish ? "pointer" : "not-allowed", marginTop: "12px" }}
      >
        FINISH MATCH
      </button>

      {isFinished && (
        <button onClick={resetCourt} style={{ width: "100%", marginTop: "10px", padding: "12px", borderRadius: "12px", border: "1px dashed #444", background: "#0B0B0B", color: "#888", fontSize: "13px", cursor: "pointer" }}>
          RESET COURT
        </button>
      )}

      {showScanner && (
        <div style={{ marginTop: 20, padding: 16, borderRadius: 16, background: "#000", textAlign: "center" }}>
          <div style={{ color: "#fff", marginBottom: 8 }}>Arahkan QR ke kamera</div>
          <div id={qrContainerIdRef} style={{ width: "100%" }} />
          <button
            onClick={async () => {
              if (qrRef.current) { try { await qrRef.current.stop(); } catch (e) {} try { qrRef.current.clear(); } catch (e) {} qrRef.current = null; }
              setShowScanner(false);
              scanTargetRef.current = null;
              slotTargetRef.current = null;
            }}
            style={{ marginTop: 12, padding: "8px 16px", cursor: "pointer" }}
          >
            Batal
          </button>
        </div>
      )}

      {showFinishConfirm && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 40 }}>
          <div style={{ background: "#111", padding: 20, borderRadius: 16, border: "1px solid #333", width: "100%", maxWidth: 280 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 8, textAlign: "center" }}>Finish match?</div>
            <div style={{ fontSize: 12, color: "#A0AEC0", textAlign: "center", marginBottom: 16 }}>Skor akan dikunci dan hasil match disimpan.</div>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => setShowFinishConfirm(false)} style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: "1px solid #2D3748", background: "#1A202C", color: "#CBD5F5", fontSize: 12, cursor: "pointer" }}>Batal</button>
              <button onClick={async () => { setShowFinishConfirm(false); await performFinishMatch(); }} style={{ flex: 1, padding: "8px 0", borderRadius: 10, border: "1px solid #4FD1C5", background: "#4FD1C5", color: "#000", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>Ya, simpan</button>
            </div>
          </div>
        </div>
      )}

      {showPlayerPicker && (
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ background: "#121212", padding: 24, borderRadius: 18, minWidth: 300, boxShadow: "0 0 40px rgba(79,209,197,0.6)" }}>
            <div style={{ marginBottom: 12, fontWeight: 600 }}>Pilih Pemain</div>
            {(allPlayers || []).filter((p) => p.name && String(p.name).trim() !== "").map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  const target = slotTargetRef.current;
                  if (!target) return;
                  setCourt((prev) => ({
                    ...prev,
                    [target.teamKey]: [...prev[target.teamKey], { id: p.id, name: p.name, photoUrl: p.photoUrl || "", isVIP: p.isVIP || false, badge: p.badge || null, slot: SLOT_ORDER[target.slotIndex] }],
                  }));
                  setShowPlayerPicker(false);
                  slotTargetRef.current = null;
                }}
                style={{ width: "100%", padding: 10, marginBottom: 8, borderRadius: 10, background: "#0B1F1E", color: "#4FD1C5", border: "1px solid #4FD1C5", cursor: "pointer" }}
              >
                {p.name}
              </button>
            ))}
            <button onClick={() => { setShowPlayerPicker(false); slotTargetRef.current = null; }} style={{ marginTop: 12, width: "100%", padding: 10, borderRadius: 10, background: "#1A0F0F", color: "#FF8A8A", border: "1px solid #553333", cursor: "pointer" }}>
              Batal
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
