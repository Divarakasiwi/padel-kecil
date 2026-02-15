"use client";

export default function StatusIndicator({ status, showDetail, onToggleDetail, pendingCount }) {
  const baseSize = 14;
  let color = "#4FD1C5";
  if (status.level === "warning") color = "#ECC94B";
  if (status.level === "error") color = "#F56565";
  if (status.level === "syncing") color = "#0054A6";

  return (
    <div style={{ position: "fixed", right: 16, bottom: 16, zIndex: 100 }}>
      <button
        onClick={onToggleDetail}
        title={status.message}
        style={{
          width: baseSize * 2,
          height: baseSize * 2,
          borderRadius: "999px",
          border: "1px solid #222",
          background: "#0B0B0B",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 0 8px rgba(0,0,0,0.8)",
          cursor: "pointer",
          padding: status.level === "syncing" ? "0 10px" : undefined,
          gap: status.level === "syncing" ? 6 : 0,
        }}
      >
        <span
          style={{
            width: baseSize,
            height: baseSize,
            borderRadius: "999px",
            background: color,
            boxShadow: `0 0 12px ${color}AA`,
          }}
        />
        {status.level === "syncing" && (
          <span
            style={{
              fontSize: 10,
              color: "#E2E8F0",
              textTransform: "uppercase",
              letterSpacing: 1,
            }}
          >
            {pendingCount > 0 ? `KIRIM ${pendingCount}` : "KIRIM"}
          </span>
        )}
      </button>
      {showDetail && (
        <div
          style={{
            marginTop: 8,
            maxWidth: 260,
            padding: 10,
            borderRadius: 10,
            background: "#111",
            border: "1px solid #333",
            fontSize: 11,
            color: "#E2E8F0",
            boxShadow: "0 10px 30px rgba(0,0,0,0.7)",
          }}
        >
          <div
            style={{
              fontWeight: 600,
              marginBottom: 4,
              color:
                status.level === "error"
                  ? "#FEB2B2"
                  : status.level === "warning"
                  ? "#F6E05E"
                  : "#9AE6B4",
            }}
          >
            {status.level === "error" ? "Perlu perhatian" : status.level === "warning" ? "Perlu dicek" : "Aman"}
          </div>
          <div style={{ lineHeight: 1.4 }}>{status.message}</div>
        </div>
      )}
    </div>
  );
}
