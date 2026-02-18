"use client";

import Link from "next/link";

export default function Header({ now, mounted }) {
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
        <Link
          href="/host/menu"
          style={{
            padding: "8px 14px",
            borderRadius: "10px",
            border: "1px solid #D6C7A1",
            background: "#1A1810",
            color: "#D6C7A1",
            fontSize: "13px",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Menu
        </Link>
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
