"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CourtPage() {
  const router = useRouter();
  const [active, setActive] = useState(null);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0B0B0B",
        color: "#fff",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "16px",
        fontFamily: "Inter, Arial, sans-serif",
      }}
    >
      <div style={{ width: "100%", maxWidth: "520px" }}>
        {/* HEADER */}
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <h1 style={{ marginBottom: "6px" }}>PADEL KECIL 🎾</h1>
          <div style={{ fontSize: "14px", color: "#888" }}>
            Court Setup
          </div>
        </div>

        {/* TEAM LABEL */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: "13px",
            color: "#888",
            marginBottom: "8px",
            letterSpacing: "1px",
          }}
        >
          <span>TEAM 1</span>
          <span>TEAM 2</span>
        </div>

        {/* COURT */}
        <div
          style={{
            border: "1px solid #222",
            borderRadius: "14px",
            padding: "22px",
            background: "#121212",
            marginBottom: "28px",
          }}
        >
          {/* ROW ATAS */}
          <div style={{ display: "flex", marginBottom: "20px" }}>
            <PlayerSlot
              name="A"
              team="left"
              active={active === "A"}
              onPress={() => setActive("A")}
            />
            <TeamDivider />
            <PlayerSlot
              name="C"
              team="right"
              active={active === "C"}
              onPress={() => setActive("C")}
            />
          </div>

          {/* ROW BAWAH */}
          <div style={{ display: "flex" }}>
            <PlayerSlot
              name="B"
              team="left"
              active={active === "B"}
              onPress={() => setActive("B")}
            />
            <TeamDivider />
            <PlayerSlot
              name="D"
              team="right"
              active={active === "D"}
              onPress={() => setActive("D")}
            />
          </div>
        </div>

        {/* CONFIRM */}
        <button
          onClick={() => router.push("/match")}
          style={{
            width: "100%",
            padding: "16px",
            fontSize: "15px",
            fontWeight: "600",
            background: "#1F1F1F",
            color: "#aaa",
            border: "1px solid #333",
            borderRadius: "10px",
            cursor: "pointer",
          }}
        >
          CONFIRM MATCH
        </button>
      </div>
    </div>
  );
}

/* ===== COMPONENTS ===== */

function PlayerSlot({ name, team, active, onPress }) {
  const teamColor = team === "left" ? "#4FD1C5" : "#D6C7A1";

  return (
    <div
      onClick={onPress}
      style={{
        flex: 1,
        height: "96px",
        borderRadius: "12px",
        border: active ? `2px solid ${teamColor}` : "1px dashed #333",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontSize: "22px",
        fontWeight: "600",
        letterSpacing: "1px",
        color: active ? teamColor : "#666",
        cursor: "pointer",
        transition: "all 0.15s ease",
        boxShadow: active
          ? `0 0 16px ${teamColor}55`
          : "none",
      }}
    >
      {name}
    </div>
  );
}

function TeamDivider() {
  return (
    <div
      style={{
        width: "10px",
        background:
          "linear-gradient(to bottom, #4FD1C5, #D6C7A1)",
        margin: "0 18px",
        borderRadius: "5px",
        opacity: 0.8,
      }}
    />
  );
}
