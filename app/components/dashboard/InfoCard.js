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
          fontSize: "13px",
          color: "#888",
          marginBottom: "12px",
          letterSpacing: "1px",
        }}
      >
        {title}
      </div>
      {children}
    </div>
  );
}
