"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { collection, getDocs, doc, updateDoc } from "firebase/firestore";
import { QRCodeCanvas } from "qrcode.react";
import { db } from "../../../firebase";

export default function HostMenuPage() {
  const router = useRouter();
  const [hostChecked, setHostChecked] = useState(false);
  const [allPlayers, setAllPlayers] = useState([]);
  const [search, setSearch] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [qrPlayer, setQrPlayer] = useState(null);

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
    getDocs(collection(db, "players"))
      .then((snap) => setAllPlayers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch((e) => console.error(e));
  }, [hostChecked]);

  const refreshPlayers = () => {
    getDocs(collection(db, "players"))
      .then((snap) => setAllPlayers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch((e) => console.error(e));
  };

  const toggleBadge = async (player) => {
    const newBadge = player.badge === "queen" ? null : "queen";
    setSavingId(player.id);
    try {
      await updateDoc(doc(db, "players", player.id), { badge: newBadge });
      refreshPlayers();
    } catch (e) {
      console.error(e);
      alert("Gagal mengubah badge. Coba lagi.");
    } finally {
      setSavingId(null);
    }
  };

  const toggleVIP = async (player) => {
    const newVIP = !(player.isVIP === true);
    setSavingId(player.id);
    try {
      await updateDoc(doc(db, "players", player.id), { isVIP: newVIP });
      refreshPlayers();
    } catch (e) {
      console.error(e);
      alert("Gagal mengubah VIP. Coba lagi.");
    } finally {
      setSavingId(null);
    }
  };

  const baseList = useMemo(
    () => (allPlayers || []).filter((p) => p.name && String(p.name).trim() !== ""),
    [allPlayers]
  );
  const filteredList = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return baseList;
    return baseList.filter((p) => String(p.name || "").toLowerCase().includes(q));
  }, [baseList, search]);

  if (!hostChecked) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0B0B0B",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#4FD1C5",
          fontSize: "14px",
        }}
      >
        Memeriksa akses...
      </div>
    );
  }

  return (
    <main
      style={{
        minHeight: "calc(100vh - 120px)",
        padding: "24px",
        background: "#0B0B0B",
        color: "#fff",
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <div style={{ marginBottom: "24px" }}>
          <Link
            href="/host/dashboard"
            style={{
              fontSize: "14px",
              color: "#9FF5EA",
              textDecoration: "none",
            }}
          >
            ← Kembali ke dashboard
          </Link>
        </div>

        <h1
          style={{
            fontSize: "20px",
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "#E8FFF9",
            marginBottom: "8px",
          }}
        >
          Menu Host
        </h1>
        <p style={{ fontSize: "13px", color: "#BEE3F8", marginBottom: "20px" }}>
          Daftar pemain — kelola badge di samping nama.
        </p>

        <div style={{ marginBottom: "20px" }}>
          <input
            type="text"
            placeholder="Cari nama pemain..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "12px 16px",
              borderRadius: "12px",
              border: "1px solid rgba(79,209,197,0.4)",
              background: "rgba(8, 20, 26, 0.9)",
              color: "#E8FFF9",
              fontSize: "14px",
            }}
          />
        </div>

        {baseList.length === 0 ? (
          <p style={{ color: "#888", fontSize: "14px" }}>Belum ada pemain terdaftar.</p>
        ) : filteredList.length === 0 ? (
          <p style={{ color: "#888", fontSize: "14px" }}>Tidak ada pemain yang cocok dengan pencarian.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {filteredList.map((p) => (
              <div
                key={p.id}
                role="button"
                tabIndex={0}
                onClick={() => setQrPlayer(p)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setQrPlayer(p);
                  }
                }}
                style={{
                  background: "rgba(8, 20, 26, 0.6)",
                  borderRadius: "12px",
                  padding: "14px 16px",
                  border: "1px solid rgba(79,209,197,0.2)",
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: "12px",
                  cursor: "pointer",
                }}
              >
                <div style={{ flex: "1 1 140px", minWidth: 0 }}>
                  <div style={{ fontWeight: 600, color: "#E8FFF9" }}>{p.name}</div>
                  {p.phone && (
                    <div style={{ fontSize: "12px", color: "#888" }}>{p.phone}</div>
                  )}
                </div>
                <div
                  style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {p.badge === "toprank" && (
                    <span
                      style={{
                        padding: "6px 12px",
                        borderRadius: "999px",
                        border: "1px solid #4FD1C5",
                        background: "rgba(79,209,197,0.15)",
                        color: "#4FD1C5",
                        fontSize: "12px",
                        fontWeight: 600,
                      }}
                      title="Otomatis untuk #1 hari ini"
                    >
                      🏆 Top Rank
                    </span>
                  )}
                  <button
                    type="button"
                    disabled={savingId === p.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleBadge(p);
                    }}
                    title={p.badge === "queen" ? "Lepas Queen" : "Pasang Queen"}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "999px",
                      border: "1px solid",
                      background: p.badge === "queen" ? "#2A2520" : "transparent",
                      color: p.badge === "queen" ? "#FFF8DC" : "#888",
                      borderColor: p.badge === "queen" ? "#D6C7A1" : "#444",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: savingId === p.id ? "wait" : "pointer",
                    }}
                  >
                    👑 Queen
                  </button>
                  <button
                    type="button"
                    disabled={savingId === p.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleVIP(p);
                    }}
                    title={p.isVIP ? "Lepas VIP" : "Pasang VIP"}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "999px",
                      border: "1px solid",
                      background: p.isVIP ? "#2A2510" : "transparent",
                      color: p.isVIP ? "#FFD700" : "#888",
                      borderColor: p.isVIP ? "#D6A100" : "#444",
                      fontSize: "12px",
                      fontWeight: 600,
                      cursor: savingId === p.id ? "wait" : "pointer",
                    }}
                  >
                    ⭐ VIP
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {qrPlayer && (
        <div
          onClick={() => setQrPlayer(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "#fff",
              borderRadius: 18,
              padding: 20,
              boxShadow: "0 0 40px rgba(79,209,197,0.3)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, color: "#111" }}>{qrPlayer.name}</div>
            <QRCodeCanvas value={qrPlayer.id || " "} size={220} includeMargin level="M" />
            <div style={{ fontSize: 12, color: "#666" }}>Tap di luar untuk menutup</div>
          </div>
        </div>
      )}
    </main>
  );
}
