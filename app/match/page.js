"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function MatchPage() {
  const router = useRouter();

  const [leftScore, setLeftScore] = useState(0);
  const [rightScore, setRightScore] = useState(0);

  const totalScore = leftScore + rightScore;
  const isFinishedReady = totalScore === 21;

  function addLeft() {
    setLeftScore((s) => s + 1);
  }

  function addRight() {
    setRightScore((s) => s + 1);
  }

  function undoLeft() {
    setLeftScore((s) => (s > 0 ? s - 1 : 0));
  }

  function undoRight() {
    setRightScore((s) => (s > 0 ? s - 1 : 0));
  }

  function finishMatch() {
    if (!isFinishedReady) return;

    // NANTI DI SINI:
    // - update statistik pemain
    // - update statistik pasangan
    // (sekarang belum)

    router.push("/");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0B0B0B",
        color: "#fff",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))",
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: "720px" }}>
        {/* HEADER */}
        <div style={{ textAlign: "center", marginBottom: "20px" }}>
          <button
            type="button"
            onClick={() => router.push("/")}
            style={{
              position: "absolute",
              left: "max(16px, env(safe-area-inset-left))",
              top: "max(16px, env(safe-area-inset-top))",
              background: "transparent",
              border: "1px solid #333",
              borderRadius: "8px",
              padding: "8px 14px",
              fontSize: "13px",
              color: "#888",
              cursor: "pointer",
            }}
          >
            ← Kembali
          </button>
          <h1 style={{ marginBottom: "4px" }}>PADEL KECIL 🎾</h1>
          <div style={{ fontSize: "14px", color: "#888" }}>
            Match Score
          </div>
        </div>

        {/* SCOREBOARD */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "#121212",
            borderRadius: "20px",
            padding: "32px 24px",
            border: "1px solid #222",
          }}
        >
          {/* TEAM 1 */}
          <ScoreBlock
            label="TEAM 1"
            score={leftScore}
            color="#4FD1C5"
            onAdd={addLeft}
            onUndo={undoLeft}
          />

          {/* VS */}
          <div
            style={{
              fontSize: "32px",
              fontWeight: "600",
              color: "#555",
              margin: "0 16px",
            }}
          >
            VS
          </div>

          {/* TEAM 2 */}
          <ScoreBlock
            label="TEAM 2"
            score={rightScore}
            color="#D6C7A1"
            onAdd={addRight}
            onUndo={undoRight}
          />
        </div>

        {/* INFO */}
        <div
          style={{
            marginTop: "16px",
            textAlign: "center",
            fontSize: "13px",
            color: totalScore > 21 ? "#ff6b6b" : "#666",
          }}
        >
          Total skor: {totalScore} / 21
        </div>

        {/* FINISH MATCH */}
        <button
          onClick={finishMatch}
          disabled={!isFinishedReady}
          style={{
            marginTop: "24px",
            width: "100%",
            padding: "18px",
            fontSize: "16px",
            fontWeight: "600",
            borderRadius: "12px",
            border: "1px solid",
            cursor: isFinishedReady ? "pointer" : "not-allowed",
            background: isFinishedReady ? "#4FD1C5" : "#1F1F1F",
            color: isFinishedReady ? "#000" : "#555",
            borderColor: isFinishedReady ? "#4FD1C5" : "#333",
            transition: "all 0.2s ease",
          }}
        >
          FINISH MATCH
        </button>
      </div>
    </div>
  );
}

/* ===== COMPONENT ===== */

function ScoreBlock({ label, score, color, onAdd, onUndo }) {
  return (
    <div style={{ flex: 1, textAlign: "center" }}>
      <div
        style={{
          fontSize: "14px",
          letterSpacing: "2px",
          color: "#888",
          marginBottom: "8px",
        }}
      >
        {label}
      </div>

      <div
        onClick={onAdd}
        style={{
          fontSize: "96px",
          fontWeight: "700",
          color,
          lineHeight: "1",
          userSelect: "none",
          cursor: "pointer",
        }}
      >
        {score}
      </div>

      <button
        onClick={onUndo}
        style={{
          marginTop: "8px",
          background: "transparent",
          border: "1px solid #333",
          borderRadius: "6px",
          padding: "4px 10px",
          fontSize: "12px",
          color: "#aaa",
          cursor: "pointer",
        }}
      >
        undo
      </button>
    </div>
  );
}
