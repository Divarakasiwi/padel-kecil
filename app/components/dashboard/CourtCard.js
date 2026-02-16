"use client";

import { useState, useRef, useEffect } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import { getTodayKey, initialCourtState, PALETTE } from "../../lib/dashboard";

const defaultPlayerStyle = { bg: "#0B0B0B", border: "#333", text: "#888" };
function getPlayerStyle(p) {
  if (typeof p.colorIndex === "number" && PALETTE[p.colorIndex]) return PALETTE[p.colorIndex];
  return defaultPlayerStyle;
}

function TeamColumn({
  title,
  players: playersProp,
  teamKey,
  color,
  onSelect,
  isFinished,
  onEmptySlotClick,
}) {
  const players = Array.isArray(playersProp) ? playersProp : [];
  const MAX_PLAYER = 2;
  const emptyCount = Math.max(0, MAX_PLAYER - players.length);

  return (
    <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
      <div style={{ fontSize: "11px", fontWeight: 600, color: "#666", marginBottom: "8px", letterSpacing: "0.05em" }}>
        {title}
      </div>
      <div style={{ display: "grid", gap: "10px", flex: 1 }}>
        {players.map((p) => {
          const style = getPlayerStyle(p);
          return (
            <div
              key={p.id}
              onClick={() => {
                if (isFinished) return;
                onSelect?.(p);
              }}
              style={{
                background: style.bg,
                padding: "16px",
                borderRadius: "14px",
                textAlign: "center",
                fontWeight: 600,
                color: style.text,
                border: `1px solid ${style.border}`,
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
  allOccupiedPlayerIds = null,
  getAssignedColor = null,
}) {
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);
  const [activePlayer, setActivePlayer] = useState(null);
  const [showScanner, setShowScanner] = useState(false);
  const [showFinishConfirm, setShowFinishConfirm] = useState(false);
  const [scanErrorMessage, setScanErrorMessage] = useState(null);

  const slotTargetRef = useRef(null);
  const qrRef = useRef(null);
  const scanTargetRef = useRef(null);
  const activePlayerIdsRef = useRef(new Set());
  const qrContainerIdRef = useRef(`qr-${title.replace(/\s/g, "-")}-${Date.now()}`).current;
  const setCourtRef = useRef(setCourt);
  const reportStatusRef = useRef(reportStatus);
  const allOccupiedRef = useRef(
    allOccupiedPlayerIds instanceof Set ? allOccupiedPlayerIds : new Set(allOccupiedPlayerIds || [])
  );
  setCourtRef.current = setCourt;
  reportStatusRef.current = reportStatus;
  allOccupiedRef.current =
    allOccupiedPlayerIds instanceof Set ? allOccupiedPlayerIds : new Set(allOccupiedPlayerIds || []);

  const [showNoteEditor, setShowNoteEditor] = useState(false);
  const [noteDraft, setNoteDraft] = useState("");

  const openNoteEditor = () => {
    setNoteDraft(court.note ?? "");
    setShowNoteEditor(true);
  };
  const saveNote = () => {
    setCourt((prev) => ({ ...prev, note: (noteDraft || "").trim() }));
    setShowNoteEditor(false);
  };

  const openScannerForSlot = (teamKey, slotIndex) => {
    scanTargetRef.current = { teamKey, slotIndex };
    setScanErrorMessage(null);
    setShowScanner(true);
  };

  const openPlayerPicker = (teamKey, slotIndex) => {
    slotTargetRef.current = { teamKey, slotIndex };
    setShowPlayerPicker(true);
  };

  useEffect(() => {
    const ids = new Set();
    (court.team1 || []).forEach((p) => ids.add(p.id));
    (court.team2 || []).forEach((p) => ids.add(p.id));
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
              setScanErrorMessage("Pemain ini sudah ada di court ini.");
              reportStatusRef.current?.({ level: "warning", message: "Pemain sudah aktif di court ini." });
              return;
            }
            if (allOccupiedRef.current.has(playerId)) {
              setScanErrorMessage("Pemain ini sudah bermain di court lain. Satu pemain hanya boleh di satu court.");
              reportStatusRef.current?.({ level: "warning", message: "Pemain sudah di court lain." });
              return;
            }

            const playerRef = doc(db, "players", playerId);
            const snap = await getDoc(playerRef);

            if (!snap.exists()) {
              setScanErrorMessage("Pemain tidak ditemukan. Pastikan QR sesuai data registrasi.");
              reportStatusRef.current?.({ level: "warning", message: "QR tidak cocok dengan data player di server." });
              return;
            }

            const assigned = getAssignedColor?.();
            if (!assigned) {
              setScanErrorMessage("Semua 50 warna sudah dipakai. Keluarkan pemain atau reset court untuk membebaskan warna.");
              return;
            }
            setCourtRef.current((prev) => {
              if (prev[target.teamKey].length >= 2) {
                setTimeout(() => setScanErrorMessage("Tim ini sudah penuh."), 0);
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
                    colorIndex: assigned.colorIndex,
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
            reportStatusRef.current?.({ level: "ok", message: "Scanner berjalan normal dan pemain berhasil ditambahkan." });
          }
        );
      } catch (e) {
        console.error(e);
        reportStatusRef.current?.({ level: "error", message: "Scanner mengalami error. Jika masalah berlanjut, silakan refresh – data match aman karena tersimpan di perangkat." });
      }
    };

    startScan();
    return () => {
      isCancelled = true;
      const s = qrRef.current;
      qrRef.current = null;
      if (!s) return;
      try {
        const stopP = s.stop();
        if (stopP && typeof stopP.catch === "function") stopP.catch(() => {});
      } catch (_) {}
      try {
        const clearP = s.clear();
        if (clearP && typeof clearP.catch === "function") clearP.catch(() => {});
      } catch (_) {}
    };
  }, [showScanner]);

  const score1 = court.score1 ?? 0;
  const score2 = court.score2 ?? 0;
  const isFinished = court.finished ?? false;
  const totalScore = score1 + score2;
  const isMaxScore = totalScore >= 21;
  const canAdd = !isFinished && !isMaxScore;
  const canFinish = totalScore === 21 && !isFinished;
  const winner = isFinished
    ? score1 > score2 ? "team1" : score2 > score1 ? "team2" : null
    : null;

  const addTeam1 = () => {
    if (!isFinished && !isMaxScore) setCourt((prev) => ({ ...prev, score1: prev.score1 + 1 }));
  };
  const addTeam2 = () => {
    if (!isFinished && !isMaxScore) setCourt((prev) => ({ ...prev, score2: prev.score2 + 1 }));
  };
  const reduceTeam1 = () => {
    if (!isFinished && score1 > 0) setCourt((prev) => ({ ...prev, score1: (prev.score1 ?? 0) - 1 }));
  };
  const reduceTeam2 = () => {
    if (!isFinished && score2 > 0) setCourt((prev) => ({ ...prev, score2: (prev.score2 ?? 0) - 1 }));
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
        score1,
        score2,
        winner: score1 > score2 ? "team1" : score2 > score1 ? "team2" : "draw",
        team1PlayerIds: (court.team1 || []).map((p) => p.id),
        team2PlayerIds: (court.team2 || []).map((p) => p.id),
        note: (court.note ?? "").trim() || null,
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

      {!showNoteEditor ? (
        <button
          onClick={openNoteEditor}
          type="button"
          style={{
            width: "100%",
            marginBottom: 14,
            padding: "12px",
            borderRadius: 12,
            textAlign: "left",
            cursor: "pointer",
            ...((court.note ?? "").trim()
              ? {
                  background: "rgba(79, 209, 197, 0.15)",
                  color: "#9FF5EA",
                  border: "1px solid #4FD1C5",
                }
              : {
                  background: "#0B1F1E",
                  color: "#4FD1C5",
                  border: "1px dashed #4FD1C5",
                }),
          }}
        >
          {(court.note ?? "").trim() ? court.note : "+ Keterangan"}
        </button>
      ) : (
        <div style={{ marginBottom: 14, display: "flex", gap: 8, alignItems: "flex-start" }}>
          <input
            type="text"
            value={noteDraft}
            onChange={(e) => setNoteDraft(e.target.value)}
            placeholder="match besar"
            autoFocus
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #333",
              background: "#0B0B0B",
              color: "#fff",
              fontSize: "14px",
            }}
          />
          <button
            type="button"
            onClick={saveNote}
            title="Simpan keterangan"
            style={{
              padding: "10px 14px",
              borderRadius: 12,
              border: "none",
              background: "#4FD1C5",
              color: "#0B0B0B",
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            ✓
          </button>
          <button
            type="button"
            onClick={() => { setShowNoteEditor(false); setNoteDraft(court.note ?? ""); }}
            style={{
              padding: "10px",
              borderRadius: 12,
              border: "1px solid #444",
              background: "transparent",
              color: "#888",
              cursor: "pointer",
            }}
          >
            Batal
          </button>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px", minWidth: 0 }}>
        <TeamColumn
          title="TEAM 1"
          teamKey="team1"
          players={court.team1 || []}
          color="#4FD1C5"
          onSelect={(player) => setActivePlayer({ player, fromTeam: "team1" })}
          isFinished={isFinished}
          onEmptySlotClick={openScannerForSlot}
        />
        <TeamColumn
          title="TEAM 2"
          teamKey="team2"
          players={court.team2 || []}
          color="#D6C7A1"
          onSelect={(player) => setActivePlayer({ player, fromTeam: "team2" })}
          isFinished={isFinished}
          onEmptySlotClick={openScannerForSlot}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", alignItems: "center", minWidth: 0 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          <div onClick={addTeam1} style={{ fontSize: "38px", fontWeight: 700, color: canAdd ? "#4FD1C5" : "#555", cursor: canAdd ? "pointer" : "not-allowed" }}>
            {score1}
          </div>
          <button onClick={reduceTeam1} disabled={score1 === 0 || isFinished} style={{ padding: "8px 16px", fontSize: "14px", minWidth: "48px", minHeight: "40px", borderRadius: "10px", border: "1px solid #4FD1C555", background: "#0B0B0B", color: "#4FD1C5", cursor: "pointer" }}>
            −
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
          <div onClick={addTeam2} style={{ fontSize: "38px", fontWeight: 700, color: canAdd ? "#D6C7A1" : "#555", cursor: canAdd ? "pointer" : "not-allowed" }}>
            {score2}
          </div>
          <button onClick={reduceTeam2} disabled={score2 === 0 || isFinished} style={{ padding: "8px 16px", fontSize: "14px", minWidth: "48px", minHeight: "40px", borderRadius: "10px", border: "1px solid #D6C7A1", background: "#0B0B0B", color: "#D6C7A1", cursor: "pointer" }}>
            −
          </button>
        </div>
      </div>

      <div style={{ textAlign: "center", fontSize: "12px", color: "#777", margin: "14px 0 10px" }}>
        total: {totalScore} / 21
      </div>

      {activePlayer && (
        <div style={{ position: "relative", zIndex: 10, marginTop: "18px", padding: "16px", borderRadius: "16px", background: "#111", border: "1px solid #2A2A2A", display: "grid", gap: "12px" }}>
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
                  [from]: prev[from].filter((p) => p.id !== movingPlayer.id),
                  [to]: [...prev[to], movingPlayer],
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
                [from]: prev[from].filter((p) => p.id !== activePlayer.player.id),
              }));
              activePlayerIdsRef.current.delete(activePlayer.player.id);
              setActivePlayer(null);
            }}
            style={{ height: "52px", borderRadius: "14px", border: "1px solid #553333", background: "#1A0F0F", color: "#FF8A8A", fontSize: "15px", fontWeight: 600, cursor: "pointer" }}
          >
            Keluarkan pemain
          </button>
          <button
            type="button"
            onClick={() => {
              if (qrRef.current) {
                try { qrRef.current.stop().catch(() => {}); } catch (_) {}
                try { qrRef.current.clear().catch(() => {}); } catch (_) {}
                qrRef.current = null;
              }
              scanTargetRef.current = null;
              setShowScanner(false);
              setActivePlayer(null);
            }}
            style={{ height: "52px", minHeight: "48px", padding: "10px", background: "#222", color: "#888", borderRadius: "14px", border: "1px solid #333", cursor: "pointer", fontSize: "15px" }}
          >
            Batal
          </button>
        </div>
      )}

      <button
        type="button"
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
        <div
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 45,
            background: "rgba(0,0,0,0.88)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div style={{ color: "#9FF5EA", fontSize: "clamp(14px, 3vw, 16px)", fontWeight: 600, marginBottom: 8, textAlign: "center" }}>
            {scanTargetRef.current
              ? `Scan untuk ${title} – ${scanTargetRef.current.teamKey === "team1" ? "Team 1" : "Team 2"}`
              : "Arahkan QR ke kamera"}
          </div>
          <div id={qrContainerIdRef} style={{ width: "min(320px, 90vw)", borderRadius: 12, overflow: "hidden" }} />
          <button
            type="button"
            onClick={() => {
              if (qrRef.current) {
                try { qrRef.current.stop().catch(() => {}); } catch (_) {}
                try { qrRef.current.clear().catch(() => {}); } catch (_) {}
                qrRef.current = null;
              }
              setShowScanner(false);
              setScanErrorMessage(null);
              scanTargetRef.current = null;
              slotTargetRef.current = null;
            }}
            style={{ marginTop: 16, padding: "12px 24px", minHeight: 48, borderRadius: 12, border: "1px solid #444", background: "#222", color: "#ccc", cursor: "pointer", fontSize: 15 }}
          >
            Batal
          </button>

          {scanErrorMessage && (
            <div
              role="button"
              tabIndex={0}
              onClick={() => setScanErrorMessage(null)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setScanErrorMessage(null); }}
              style={{
                position: "absolute",
                inset: 0,
                background: "rgba(0,0,0,0.9)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: 24,
                cursor: "pointer",
              }}
            >
              <p style={{ color: "#FF8A8A", fontSize: "clamp(15px, 3.5vw, 17px)", fontWeight: 600, textAlign: "center", margin: 0 }}>
                {scanErrorMessage}
              </p>
              <p style={{ color: "#888", fontSize: 13, marginTop: 12, marginBottom: 0 }}>
                Tap di mana saja untuk lanjut scan
              </p>
            </div>
          )}
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
                  const assigned = getAssignedColor?.();
                  if (!assigned) {
                    alert("Semua 50 warna sudah dipakai. Keluarkan pemain atau reset court untuk membebaskan warna.");
                    return;
                  }
                  setCourt((prev) => ({
                    ...prev,
                    [target.teamKey]: [...prev[target.teamKey], { id: p.id, name: p.name, photoUrl: p.photoUrl || "", isVIP: p.isVIP || false, badge: p.badge || null, colorIndex: assigned.colorIndex }],
                  }));
                  activePlayerIdsRef.current.add(p.id);
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
