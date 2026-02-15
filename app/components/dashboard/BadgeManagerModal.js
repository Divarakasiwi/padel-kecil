"use client";

import { useState } from "react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase";

export default function BadgeManagerModal({ allPlayers, onRefresh, onClose }) {
  const [savingId, setSavingId] = useState(null);

  const toggleBadge = async (player) => {
    const newBadge = player.badge === "queen" ? null : "queen";
    setSavingId(player.id);
    try {
      await updateDoc(doc(db, "players", player.id), { badge: newBadge });
      onRefresh?.();
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
      onRefresh?.();
    } catch (e) {
      console.error(e);
      alert("Gagal mengubah VIP. Coba lagi.");
    } finally {
      setSavingId(null);
    }
  };

  const list = (allPlayers || []).filter((p) => p.name && String(p.name).trim() !== "");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.8)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: "max(24px, env(safe-area-inset-top))",
      }}
    >
      <div
        style={{
          background: "#121212",
          borderRadius: "18px",
          border: "1px solid #333",
          maxWidth: "480px",
          width: "100%",
          maxHeight: "85vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 0 40px rgba(79,209,197,0.2)",
        }}
      >
        <div
          style={{
            padding: "20px 20px 12px",
            borderBottom: "1px solid #222",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ margin: 0, fontSize: "18px" }}>Kelola Badge</h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "1px solid #444",
              borderRadius: "8px",
              color: "#888",
              padding: "8px 14px",
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            Tutup
          </button>
        </div>
        <div style={{ overflow: "auto", padding: "16px", flex: 1 }}>
          <p style={{ fontSize: "12px", color: "#888", marginBottom: "16px" }}>
            Klik badge untuk mengaktifkan/nonaktifkan. Perubahan tersimpan langsung ke server.
          </p>
          {list.length === 0 ? (
            <p style={{ color: "#666", fontSize: "14px" }}>Belum ada pemain terdaftar.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {list.map((p) => (
                <div
                  key={p.id}
                  style={{
                    background: "#0B0B0B",
                    borderRadius: "12px",
                    padding: "14px 16px",
                    border: "1px solid #222",
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    gap: "12px",
                  }}
                >
                  <div style={{ flex: "1 1 140px", minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    {p.phone && (
                      <div style={{ fontSize: "12px", color: "#666" }}>{p.phone}</div>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <button
                      type="button"
                      disabled={savingId === p.id}
                      onClick={() => toggleBadge(p)}
                      title={p.badge === "queen" ? "Lepas Queen" : "Pasang Queen"}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "999px",
                        border: "1px solid",
                        background: p.badge === "queen" ? "#2A2520" : "transparent",
                        color: p.badge === "queen" ? "#FFF8DC" : "#666",
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
                      onClick={() => toggleVIP(p)}
                      title={p.isVIP ? "Lepas VIP" : "Pasang VIP"}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "999px",
                        border: "1px solid",
                        background: p.isVIP ? "#2A2510" : "transparent",
                        color: p.isVIP ? "#FFD700" : "#666",
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
      </div>
    </div>
  );
}
