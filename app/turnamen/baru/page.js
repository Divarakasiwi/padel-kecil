"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { HOST_AUTH_KEY } from "../../lib/dashboard";

const sectionStyle = {
  marginBottom: "24px",
  padding: "16px",
  background: "#1a1212",
  borderRadius: "12px",
  border: "1px solid #2a2222",
};

const labelStyle = { display: "block", marginBottom: "6px", color: "#b8a8a8", fontSize: "13px" };

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  background: "#110b0b",
  border: "1px solid #332828",
  borderRadius: "10px",
  color: "#fff",
  fontSize: "15px",
  boxSizing: "border-box",
};

export default function TurnamenBaruPage() {
  const router = useRouter();
  const [hostChecked, setHostChecked] = useState(false);

  const [namaTurnamen, setNamaTurnamen] = useState("");
  const [jumlahPemain, setJumlahPemain] = useState("8");
  const [tanggalMulai, setTanggalMulai] = useState("");
  const [tanggalSelesai, setTanggalSelesai] = useState("");
  const [ketentuanLain, setKetentuanLain] = useState("");
  const refTanggalMulai = useRef(null);
  const refTanggalSelesai = useRef(null);

  function getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!sessionStorage.getItem(HOST_AUTH_KEY)) {
      router.replace("/host");
      return;
    }
    setHostChecked(true);
    const today = getTodayStr();
    setTanggalMulai((t) => (t === "" ? today : t));
    setTanggalSelesai((s) => (s === "" ? today : s));
  }, [router]);

  const handleBuatPertandingan = () => {
    // Selanjutnya akan diisi sesuai instruksi
  };

  if (!hostChecked) return null;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0e0909 0%, #120c0c 50%, #0d0808 100%)",
        color: "#fff",
        padding: "max(24px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(24px, env(safe-area-inset-left))",
        fontFamily: "Inter, system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <style>{`
        @keyframes auraBreath {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.65; }
        }
        @keyframes auraDrift {
          0%, 100% { transform: translateX(-12%); }
          50% { transform: translateX(12%); }
        }
        .turnamen-aura {
          animation: auraBreath 5s ease-in-out infinite, auraDrift 14s ease-in-out infinite;
        }
      `}</style>
      <div
        className="turnamen-aura"
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          width: "140%",
          height: "80%",
          marginTop: "-40%",
          marginLeft: "-70%",
          background: "radial-gradient(ellipse at center, rgba(79, 209, 197, 0.5) 0%, rgba(79, 209, 197, 0.25) 35%, rgba(50, 160, 150, 0.12) 60%, transparent 75%)",
          filter: "blur(50px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />
      <div style={{ position: "relative", zIndex: 1, maxWidth: "560px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <h1 style={{ margin: 0, fontSize: "22px", color: "#E8FFF9" }}>Ketentuan lomba</h1>
          <Link
            href="/"
            style={{
              background: "transparent",
              border: "1px solid #444",
              color: "#9FF5EA",
              padding: "10px 16px",
              borderRadius: "10px",
              fontSize: "14px",
              textDecoration: "none",
            }}
          >
            ← Kembali
          </Link>
        </div>

        <section style={sectionStyle}>
          <h2 style={{ margin: "0 0 16px", fontSize: "14px", color: "#4FD1C5", letterSpacing: "0.05em" }}>KETENTUAN TURNAMEN</h2>

          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Nama turnamen</label>
            <input
              type="text"
              value={namaTurnamen}
              onChange={(e) => setNamaTurnamen(e.target.value)}
              placeholder="Contoh: Padel Cup Desember"
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Jumlah tim</label>
            <select
              value={jumlahPemain}
              onChange={(e) => setJumlahPemain(e.target.value)}
              style={inputStyle}
            >
              <option value="4">4</option>
              <option value="8">8</option>
              <option value="16">16</option>
            </select>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Tanggal mulai</label>
            <div
              role="button"
              tabIndex={0}
              onClick={() => refTanggalMulai.current?.showPicker?.() || refTanggalMulai.current?.focus()}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") refTanggalMulai.current?.showPicker?.() || refTanggalMulai.current?.focus(); }}
              style={{ cursor: "pointer" }}
            >
              <input
                ref={refTanggalMulai}
                type="date"
                value={tanggalMulai}
                onChange={(e) => setTanggalMulai(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer", display: "block" }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Tanggal selesai</label>
            <div
              role="button"
              tabIndex={0}
              onClick={() => refTanggalSelesai.current?.showPicker?.() || refTanggalSelesai.current?.focus()}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") refTanggalSelesai.current?.showPicker?.() || refTanggalSelesai.current?.focus(); }}
              style={{ cursor: "pointer" }}
            >
              <input
                ref={refTanggalSelesai}
                type="date"
                value={tanggalSelesai}
                onChange={(e) => setTanggalSelesai(e.target.value)}
                style={{ ...inputStyle, cursor: "pointer", display: "block" }}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Ketentuan lainnya (opsional)</label>
            <textarea
              value={ketentuanLain}
              onChange={(e) => setKetentuanLain(e.target.value)}
              placeholder="Aturan tambahan, hadiah, dll."
              rows={4}
              style={{ ...inputStyle, resize: "vertical", minHeight: "100px" }}
            />
          </div>
        </section>

        <div style={{ marginTop: "24px", marginBottom: "32px" }}>
          <button
            type="button"
            onClick={handleBuatPertandingan}
            style={{
              width: "100%",
              minHeight: "52px",
              padding: "16px 20px",
              background: "rgba(220, 80, 80, 0.2)",
              border: "1px solid rgba(220, 80, 80, 0.7)",
              borderRadius: "14px",
              color: "#E87A7A",
              fontSize: "16px",
              fontWeight: 600,
              cursor: "pointer",
              letterSpacing: "0.04em",
              boxShadow: "0 0 20px rgba(220, 80, 80, 0.25)",
            }}
          >
            BUAT PERTANDINGAN
          </button>
        </div>
      </div>
    </main>
  );
}
