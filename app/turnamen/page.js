"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../../firebase";

const MONTHS = "Jan Feb Mar Apr Mei Jun Jul Agt Sep Okt Nov Des".split(" ");

function formatDayKey(dayKey) {
  if (!dayKey || dayKey.length < 10) return dayKey;
  const [y, m, d] = dayKey.split("-");
  const mi = parseInt(m, 10) - 1;
  return `${parseInt(d, 10)} ${MONTHS[mi]} ${y}`;
}

export default function TurnamenListPage() {
  const router = useRouter();
  const [hostChecked, setHostChecked] = useState(false);
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof window === "undefined") return;
    fetch("/api/auth/host/check", { credentials: "include" })
      .then((r) => {
        if (!r.ok) router.replace("/host");
        else setHostChecked(true);
      })
      .catch(() => router.replace("/host"));
  }, [router]);

  useEffect(() => {
    if (!hostChecked) return;
    const load = async () => {
      try {
        const q = query(
          collection(db, "tournaments"),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        setTournaments(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (e) {
        console.error(e);
        setTournaments([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [hostChecked]);

  if (!hostChecked) return null;

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#0B0B0B",
        color: "#fff",
        padding: "max(24px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(24px, env(safe-area-inset-left))",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: "560px", margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <h1 style={{ margin: 0, fontSize: "22px", color: "#E8FFF9" }}>Lomba yang sudah dibuat</h1>
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
            ← Dashboard
          </Link>
        </div>

        {loading && (
          <p style={{ color: "#9A9A9A", textAlign: "center", padding: "24px" }}>Memuat...</p>
        )}

        {!loading && tournaments.length === 0 && (
          <p style={{ color: "#9A9A9A", textAlign: "center", padding: "24px" }}>
            Belum ada lomba. Buat dari halaman ketentuan lomba.
          </p>
        )}

        {!loading && tournaments.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
            {tournaments.map((t) => (
              <Link
                key={t.id}
                href={`/turnamen/${t.id}/bagan`}
                style={{
                  display: "block",
                  padding: "16px",
                  background: "#121212",
                  borderRadius: "12px",
                  border: "1px solid #222",
                  fontSize: "14px",
                  textDecoration: "none",
                  color: "inherit",
                  cursor: "pointer",
                  transition: "border-color 0.2s, background 0.2s",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = "#4FD1C5";
                  e.currentTarget.style.background = "#1a1a1a";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = "#222";
                  e.currentTarget.style.background = "#121212";
                }}
              >
                <div style={{ fontWeight: 600, color: "#fff", marginBottom: "4px" }}>
                  {t.namaTurnamen || "Tanpa nama"}
                </div>
                <div style={{ color: "#888", fontSize: "13px" }}>
                  {t.jumlahTim || "?"} tim · {formatDayKey(t.tanggalMulai)} – {formatDayKey(t.tanggalSelesai)}
                </div>
              </Link>
            ))}
          </div>
        )}

        <Link
          href="/turnamen/baru"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            minHeight: "48px",
            padding: "16px 20px",
            background: "rgba(220, 80, 80, 0.12)",
            border: "1px solid rgba(220, 80, 80, 0.6)",
            borderRadius: "14px",
            color: "#E87A7A",
            fontSize: "15px",
            fontWeight: 500,
            textDecoration: "none",
            boxSizing: "border-box",
            boxShadow: "0 0 20px rgba(220, 80, 80, 0.25)",
          }}
        >
          Buat lomba baru
        </Link>
      </div>
    </main>
  );
}
