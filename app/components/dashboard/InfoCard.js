"use client";

export default function InfoCard({ title, children }) {
  return (
    <div
      style={{
        background: "#121212",
        borderRadius: "16px",
        padding: "16px",
        border: "1px solid #222",
      }}
    >
      <div
        style={{
          fontSize: "14px",
          fontWeight: 600,
          color: "#B0B0B0",
          marginBottom: "12px",
          letterSpacing: "0.08em",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}
