"use client";

export default function InfoRow({ left, right, badge }) {
  return (
    <div
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
          maxWidth: "65%",
        }}
      >
        {left}
      </span>
      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <span style={{ color: "#9A9A9A" }}>{right}</span>
        {badge && (
          <span
            style={{
              fontSize: "11px",
              padding: "3px 10px",
              borderRadius: "999px",
              border: "1px solid #4FD1C5",
              color: "#4FD1C5",
              whiteSpace: "nowrap",
            }}
          >
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}
