"use client";

export default function Header({ now, mounted, onOpenBadgeManager }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        alignItems: "center",
        marginBottom: "28px",
        flexWrap: "wrap",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        {onOpenBadgeManager && (
          <button
            type="button"
            onClick={onOpenBadgeManager}
            style={{
              padding: "8px 14px",
              borderRadius: "10px",
              border: "1px solid #D6C7A1",
              background: "#1A1810",
              color: "#D6C7A1",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Kelola Badge
          </button>
        )}
        <div
          style={{
            fontFamily: "'Courier New', monospace",
            fontSize: "15px",
            color: "#4FD1C5",
          }}
        >
          {mounted ? now.toLocaleTimeString("id-ID") : "--:--"}
        </div>
      </div>
    </div>
  );
}
