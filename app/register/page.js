"use client";

import { useState } from "react";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0B0B0B",
        color: "#fff",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: "24px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#121212",
          padding: "24px",
          borderRadius: "16px",
          border: "1px solid #222",
        }}
      >
        <h2 style={{ marginBottom: "20px", textAlign: "center" }}>
          Daftar Pemain
        </h2>

        <div style={{ marginBottom: "14px" }}>
          <label>Nama</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nama lengkap"
            style={inputStyle}
          />
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label>Nomor HP</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="08xxxxxxxxxx"
            style={inputStyle}
          />
        </div>

        <button style={buttonStyle}>DAFTAR</button>
      </div>
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "14px",
  marginTop: "6px",
  borderRadius: "10px",
  border: "1px solid #333",
  background: "#0B0B0B",
  color: "#fff",
};

const buttonStyle = {
  width: "100%",
  padding: "14px",
  borderRadius: "12px",
  border: "none",
  background: "#4FD1C5",
  color: "#000",
  fontWeight: 600,
  cursor: "pointer",
};
