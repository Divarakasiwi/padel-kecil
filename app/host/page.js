"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { JetBrains_Mono } from "next/font/google";

const jetbrains = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "600", "700"] });
const FULL_TEXT = "Selamat datang para host";

export default function HostLoginPage() {
  const router = useRouter();
  const [displayText, setDisplayText] = useState("");
  const [cursorVisible, setCursorVisible] = useState(true);
  const [typingDone, setTypingDone] = useState(false);
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // Typewriter: tampilkan teks huruf per huruf
  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i <= FULL_TEXT.length) {
        setDisplayText(FULL_TEXT.slice(0, i));
        i++;
      } else {
        clearInterval(interval);
        setTypingDone(true);
      }
    }, 80);
    return () => clearInterval(interval);
  }, []);

  // Kursor berkedip setelah selesai ketik
  useEffect(() => {
    if (!typingDone) return;
    const blink = setInterval(() => setCursorVisible((v) => !v), 500);
    return () => clearInterval(blink);
  }, [typingDone]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await fetch("/api/auth/host", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: password }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) {
        router.push("/");
        return;
      }
      setLoginError(data.error || "PIN salah. Hanya host yang boleh masuk.");
    } catch {
      setLoginError("Koneksi gagal. Coba lagi.");
    }
  };

  return (
    <div
      className={jetbrains.className}
      style={{
        minHeight: "100vh",
        background: "#050508",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Grid / cyber background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `
            linear-gradient(rgba(0, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0, 255, 255, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: "32px 32px",
          pointerEvents: "none",
        }}
      />
      {/* Glow orbs */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "20%",
          width: "300px",
          height: "300px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(0, 255, 255, 0.15) 0%, transparent 70%)",
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "20%",
          right: "15%",
          width: "250px",
          height: "250px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(255, 0, 128, 0.12) 0%, transparent 70%)",
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "420px" }}>
        {/* Judul dengan efek ketik + glow */}
        <h1
          style={{
            fontSize: "clamp(1.25rem, 5vw, 1.75rem)",
            fontWeight: 700,
            letterSpacing: "0.12em",
            textAlign: "center",
            marginBottom: "48px",
            lineHeight: 1.5,
            textShadow: typingDone
              ? "0 0 20px rgba(0, 255, 255, 0.8), 0 0 40px rgba(0, 255, 255, 0.5), 0 0 60px rgba(0, 255, 255, 0.3)"
              : "0 0 10px rgba(0, 255, 255, 0.5)",
            color: "#E0F7FA",
            transition: "text-shadow 0.5s ease",
          }}
        >
          {displayText}
          <span
            style={{
              opacity: cursorVisible ? 1 : 0,
              color: "#00E5FF",
              fontWeight: 300,
              transition: "opacity 0.1s",
            }}
          >
            |
          </span>
        </h1>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          style={{
            background: "rgba(10, 15, 20, 0.85)",
            border: "1px solid rgba(0, 255, 255, 0.25)",
            borderRadius: "16px",
            padding: "28px 24px",
            boxShadow: "0 0 30px rgba(0, 255, 255, 0.1), inset 0 0 40px rgba(0, 0, 0, 0.3)",
          }}
        >
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                letterSpacing: "0.2em",
                color: "#00E5FF",
                marginBottom: "8px",
                textTransform: "uppercase",
              }}
            >
              ID
            </label>
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              placeholder="Masukkan ID"
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: "10px",
                border: "1px solid rgba(0, 255, 255, 0.3)",
                background: "rgba(0, 20, 30, 0.8)",
                color: "#E0F7FA",
                fontSize: "14px",
                outline: "none",
                boxShadow: "0 0 12px rgba(0, 255, 255, 0.08)",
              }}
            />
          </div>
          <div style={{ marginBottom: "24px" }}>
            <label
              style={{
                display: "block",
                fontSize: "11px",
                letterSpacing: "0.2em",
                color: "#00E5FF",
                marginBottom: "8px",
                textTransform: "uppercase",
              }}
            >
              PIN host
            </label>
            <input
              type="password"
              value={password}
              placeholder="Masukkan PIN host"
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: "10px",
                border: "1px solid rgba(0, 255, 255, 0.3)",
                background: "rgba(0, 20, 30, 0.8)",
                color: "#E0F7FA",
                fontSize: "14px",
                outline: "none",
                boxShadow: "0 0 12px rgba(0, 255, 255, 0.08)",
              }}
            />
          </div>
          {loginError && (
            <p style={{ color: "#F56565", fontSize: "13px", marginBottom: "16px" }}>{loginError}</p>
          )}
          <button
            type="submit"
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: "12px",
              border: "1px solid rgba(0, 255, 255, 0.5)",
              background: "linear-gradient(180deg, rgba(0, 229, 255, 0.2) 0%, rgba(0, 150, 200, 0.15) 100%)",
              color: "#00E5FF",
              fontSize: "14px",
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              cursor: "pointer",
              boxShadow: "0 0 20px rgba(0, 255, 255, 0.2)",
              transition: "all 0.2s ease",
            }}
          >
            Login
          </button>
        </form>

        <p
          style={{
            marginTop: "20px",
            textAlign: "center",
            fontSize: "11px",
            color: "rgba(0, 229, 255, 0.5)",
            letterSpacing: "0.08em",
          }}
        >
          PADEL KECIL — Host access
        </p>
      </div>
    </div>
  );
}
