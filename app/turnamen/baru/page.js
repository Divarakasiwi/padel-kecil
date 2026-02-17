"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../../../firebase";

function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 6; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
}

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
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [createdCode, setCreatedCode] = useState("");
  const [createdLink, setCreatedLink] = useState("");
  const refTanggalMulai = useRef(null);
  const refTanggalSelesai = useRef(null);

  function getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    fetch("/api/auth/host/check", { credentials: "include" })
      .then((r) => {
        if (!r.ok) router.replace("/host");
        else {
          setHostChecked(true);
          const today = getTodayStr();
          setTanggalMulai((t) => (t === "" ? today : t));
          setTanggalSelesai((s) => (s === "" ? today : s));
        }
      })
      .catch(() => router.replace("/host"));
  }, [router]);

  const handleBuatPertandingan = async () => {
    const nama = (namaTurnamen || "").trim();
    if (!nama) {
      setSaveError("Nama turnamen wajib diisi.");
      return;
    }
    setSaveError("");
    setSaving(true);
    try {
      const code = generateCode();
      await addDoc(collection(db, "tournaments"), {
        namaTurnamen: nama,
        jumlahTim: Number(jumlahPemain) || 8,
        tanggalMulai: tanggalMulai || null,
        tanggalSelesai: tanggalSelesai || null,
        ketentuanLain: (ketentuanLain || "").trim() || null,
        code,
        teams: [],
        createdAt: new Date().toISOString(),
      });
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      setCreatedLink(`${origin}/turnamen/daftar?code=${code}`);
      setCreatedCode(code);
    } catch (e) {
      console.error(e);
      setSaveError("Gagal menyimpan. Cek koneksi.");
    } finally {
      setSaving(false);
    }
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
        <div style={{ marginBottom: "16px" }}>
          <Link
            href="/turnamen"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "100%",
              minHeight: "44px",
              padding: "12px 20px",
              background: "rgba(79, 209, 197, 0.12)",
              border: "1px solid rgba(79, 209, 197, 0.5)",
              borderRadius: "12px",
              color: "#9FF5EA",
              fontSize: "14px",
              fontWeight: 500,
              textDecoration: "none",
              boxSizing: "border-box",
            }}
          >
            Lomba yang sudah dibuat
          </Link>
        </div>
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

        <section style={sectionStyle}>
          <h2 style={{ margin: "0 0 12px", fontSize: "14px", color: "#4FD1C5", letterSpacing: "0.05em" }}>PENDAFTARAN DI MEJA</h2>
          <p style={{ margin: "0 0 12px", fontSize: "13px", color: "#b8a8a8", lineHeight: 1.5 }}>
            Semua tim mendaftar di <strong style={{ color: "#E8FFF9" }}>satu meja</strong>. Antri per tim, lalu daftar dengan scan barcode/QR.
          </p>
          <ol style={{ margin: 0, paddingLeft: "20px", fontSize: "13px", color: "#b8a8a8", lineHeight: 1.8 }}>
            <li>Sediakan <strong style={{ color: "#E8FFF9" }}>satu device</strong> di meja (HP/tablet) untuk pendaftaran, atau pajang <strong style={{ color: "#E8FFF9" }}>satu QR/link</strong> yang sama untuk dibuka peserta.</li>
            <li>Masukkan <strong style={{ color: "#E8FFF9" }}>kode turnamen</strong> (akan muncul setelah lomba dibuat).</li>
            <li>Per tim: <strong style={{ color: "#E8FFF9" }}>scan QR/barcode pemain 1</strong> → <strong style={{ color: "#E8FFF9" }}>scan pemain 2</strong> → Daftar.</li>
            <li>Tim berikutnya antri, ulangi langkah 3.</li>
            <li>Pendaftaran otomatis ditutup setelah <strong style={{ color: "#4FD1C5" }}>{jumlahPemain} tim</strong> terdaftar.</li>
          </ol>
          <p style={{ margin: "12px 0 0", fontSize: "12px", color: "#888" }}>
            Setelah klik &quot;Buat pertandingan&quot;, simpan atau tampilkan <strong>kode turnamen</strong> &amp; link pendaftaran di meja agar panitia/peserta bisa daftar.
          </p>
        </section>

        {saveError && <p style={{ color: "#FF6B6B", fontSize: "13px", marginBottom: "12px" }}>{saveError}</p>}
        <div style={{ marginTop: "24px", marginBottom: "32px" }}>
          <button
            type="button"
            onClick={handleBuatPertandingan}
            disabled={saving}
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
              cursor: saving ? "not-allowed" : "pointer",
              letterSpacing: "0.04em",
              boxShadow: "0 0 20px rgba(220, 80, 80, 0.25)",
            }}
          >
            {saving ? "Menyimpan..." : "BUAT PERTANDINGAN"}
          </button>
        </div>
        {createdCode && (
          <section style={{ ...sectionStyle, borderColor: "#2d6a64", background: "rgba(79,209,197,0.08)" }}>
            <h2 style={{ margin: "0 0 12px", fontSize: "14px", color: "#4FD1C5", letterSpacing: "0.05em" }}>LOMBA BERHASIL DIBUAT</h2>
            <p style={{ margin: "0 0 8px", fontSize: "13px", color: "#b8a8a8" }}>Kode turnamen (tampilkan di meja pendaftaran):</p>
            <p style={{ margin: "0 0 16px", fontSize: "20px", fontWeight: 700, letterSpacing: "0.15em", color: "#9FF5EA" }}>{createdCode}</p>
            <p style={{ margin: "0 0 8px", fontSize: "13px", color: "#b8a8a8" }}>Link pendaftaran:</p>
            <Link
              href={createdLink}
              style={{ fontSize: "14px", color: "#4FD1C5", wordBreak: "break-all" }}
            >
              {createdLink}
            </Link>
            <p style={{ margin: "12px 0 0", fontSize: "12px", color: "#888" }}>
              Buka link ini di device meja pendaftaran, atau bagikan ke peserta. Kode akan terisi otomatis dari link.
            </p>
          </section>
        )}
      </div>
    </main>
  );
}
