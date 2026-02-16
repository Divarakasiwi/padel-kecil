"use client";

import Link from "next/link";

export default function CaraPakaiPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0B0B0B",
        color: "#fff",
        padding: "max(24px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(24px, env(safe-area-inset-left))",
        fontFamily: "Inter, system-ui, Arial, sans-serif",
      }}
    >
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
          <h1 style={{ margin: 0, fontSize: "22px", color: "#E8FFF9" }}>Cara pakai</h1>
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

        <section style={{ marginBottom: "28px" }}>
          <h2 style={{ margin: "0 0 12px", fontSize: "15px", color: "#4FD1C5", letterSpacing: "0.05em" }}>HOST (Dashboard)</h2>
          <ul style={{ margin: 0, paddingLeft: "20px", color: "#ccc", fontSize: "14px", lineHeight: 1.8 }}>
            <li>Scan QR pemain untuk memasukkan ke court (Team 1 / Team 2).</li>
            <li>Atur skor, lalu <strong>Finish match</strong> jika sudah selesai.</li>
            <li>Hasil match tersimpan dan disinkronkan ke server (pastikan online).</li>
            <li>Player Priority: pemain yang sudah selesai match hari ini, urut dari yang paling sedikit main.</li>
            <li>Juara 1–3: pemain dengan kemenangan terbanyak hari ini.</li>
            <li>Riwayat pertandingan: top winning teams (filter Semua waktu / Bulan / Minggu).</li>
            <li>Riwayat claim minuman: daftar klaim minuman gratis (filter tanggal).</li>
          </ul>
        </section>

        <section>
          <h2 style={{ margin: "0 0 12px", fontSize: "15px", color: "#4FD1C5", letterSpacing: "0.05em" }}>BARISTA (Minuman gratis)</h2>
          <ul style={{ margin: 0, paddingLeft: "20px", color: "#ccc", fontSize: "14px", lineHeight: 1.8 }}>
            <li>Buka halaman Barista (PIN jika sudah diatur).</li>
            <li>Scan QR kartu pemain. Jika pemain sudah main hari ini dan belum klaim, tampil nama + foto + &quot;Claim sukses&quot;.</li>
            <li>Satu pemain hanya bisa claim sekali per hari.</li>
            <li>Setelah claim, tunggu 7 detik sebelum scan pemain berikutnya.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
