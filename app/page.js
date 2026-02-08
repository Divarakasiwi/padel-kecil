"use client";
console.log("🔥 PAGE.JS TERBARU AKTIF 🔥");
import { collection, getDocs } from "firebase/firestore";

import { Html5Qrcode } from "html5-qrcode";
import { useEffect, useState, useRef } from "react";

  const SLOT_ORDER = ["A", "B", "C", "D"];
 const SLOT_COLORS = {
  A: {
    bg: "#2A0F0F",
    border: "#FF6B6B",
    text: "#FFB3B3",
  },
  B: {
    bg: "#0F1A2A",
    border: "#4DA3FF",
    text: "#B3D9FF",
  },
  C: {
    bg: "#102016",
    border: "#4FD1C5",
    text: "#9FF5EA",
  },
  D: {
    bg: "#221A0A",
    border: "#E6C36A",
    text: "#FFF1B8",
  },
};


import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";


const initialCourt1={
    team1: [],
    team2: [],

    score1: 0,
    score2: 0,
    finished: false,
              };

  const initialCourt2={
    team1: [],
    team2: [],
    score1: 0,
    score2: 0,
    finished: false,
  };
export default function Dashboard() {
  const [now, setNow] = useState(new Date());
 /* =====================
     COURT STATE
  ===================== */

  
const [court1, setCourt1] = useState(initialCourt1);
const [court2, setCourt2] = useState(initialCourt2);
const [mounted, setMounted] = useState(false);
 






useEffect(() => {
  setMounted(true);

  const t = setInterval(() => setNow(new Date()), 1000);
  return () => clearInterval(t);
}, []);

 
  /* =====================
     DATA RINGAN (HOST)
  ===================== */

  const players = [
    { name: "Willy", played: 0 },
    { name: "Siska", played: 1 },
    { name: "Agus", played: 2 },
    { name: "Lestaluhuma", played: 2 },
    { name: "Winarto Sudehi", played: 3 },
  ].sort((a, b) => a.played - b.played);

  const pairings = [
    { pair: "Willy + Siska", times: 1 },
    { pair: "Agus + Lestaluhuma", times: 2 },
    { pair: "Winarto Sudehi + Agus", times: 3 },
  ];

  const topRanks = [
    { team: "Willy + Agus", wins: 2 },
    { team: "Siska + Winarto Sudehi", wins: 1 },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0B0B0B",
        color: "#fff",
        padding: "24px",
        fontFamily: "Inter, system-ui, Arial, sans-serif",
      }}
    >
      {/* HEADER */}
      <Header now={now} mounted={mounted} />

      {/* COURTS */}
      <div
  style={{
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "20px",
    marginBottom: "32px",
  }}
>
  {/* COURT 1 */}
  <CourtCard
    title="COURT 1"
    court={court1}
    setCourt={setCourt1}
    initialCourt={initialCourt1}
    
  />

  {/* ADD COURT PLACEHOLDER */}
  <div
    style={{
      background: "#0B0B0B",
      borderRadius: "18px",
      border: "2px dashed #4FD1C5",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "320px",
      cursor: "pointer",

      /* ✨ GLOW EFFECT */
      boxShadow: `
        0 0 12px rgba(79,209,197,0.4),
        inset 0 0 18px rgba(79,209,197,0.25)
      `,
      transition: "all 0.25s ease",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow =
        "0 0 22px rgba(79,209,197,0.8), inset 0 0 26px rgba(79,209,197,0.45)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow =
        "0 0 12px rgba(79,209,197,0.4), inset 0 0 18px rgba(79,209,197,0.25)";
    }}
  >
    <div
      style={{
        fontSize: "64px",
        fontWeight: 700,
        color: "#4FD1C5",
        textShadow: "0 0 18px rgba(79,209,197,0.9)",
        userSelect: "none",
      }}
    >
      +
    </div>
  </div>
</div>

      

      {/* INFO */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "20px",
          marginBottom: "32px",
        }}
      >
        {/* PLAYER PRIORITY */}
        <InfoCard title="PLAYER PRIORITY (HOST)">
          {players.map((p, index) => (
            <InfoRow
              key={p.name}
              left={p.name}
              right={`${p.played}x`}
              badge={p.played === 0 ? "recommended" : null}
            />
          ))}
        </InfoCard>

        {/* PAIRING INSIGHT */}
        <InfoCard title="PAIRING INSIGHT (HOST)">
          {pairings.map((p) => (
            <InfoRow
              key={p.pair}
              left={p.pair}
              right={`${p.times}x`}
              badge={p.times >= 3 ? "often" : null}
            />
          ))}
        </InfoCard>
      </div>

      {/* TOP RANK */}
      <InfoCard title="TOP WINNING TEAMS (TODAY)">
        {topRanks.map((t, i) => (
          <InfoRow
            key={t.team}
            left={`${i + 1}. ${t.team}`}
            right={`${t.wins} wins`}
          />
        ))}
      </InfoCard>
    </div>
  );
}

/* =====================
   COMPONENTS
===================== */

function Header({ now,mounted }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        marginBottom: "28px",
      }}
    >
      <h1 style={{ margin: 0, fontWeight: 600 }}>
        PADEL KECIL 🎾 By Fery
      </h1>
      <div
        style={{
          fontFamily: "'Courier New', monospace",
          fontSize: "15px",
          color: "#4FD1C5",
        }}
      >
       {mounted ? now.toLocaleTimeString("id-ID") : "--:--"}

      </div>
    </div>
  );
}

function CourtCard({ title, court, setCourt, initialCourt, setSlotTarget }) {
  const [showPlayerPicker, setShowPlayerPicker] = useState(false);

  const [allPlayers, setAllPlayers] = useState([]);
  const addTestPlayer = () => {

  if (court.team1.length >= 2) return;
  const player = {
    id: `test_${Date.now()}`,
    name: "Willy (TEST)",
    photoUrl: "",
    isVIP: true,
    slot: SLOT_ORDER[court.team1.length],
  };

  setCourt(prev => ({
    ...prev,
    team1: [...prev.team1, player],
  }));
};



const slotTargetRef = useRef(null);
  const qrRef = useRef(null);
  const scanTargetRef = useRef(null);
  const openScannerForSlot = (teamKey, slotIndex) => {
  scanTargetRef.current = { teamKey, slotIndex };
  setShowScanner(true);
};





const [activePlayer, setActivePlayer] = useState(null);
const activePlayerIdsRef = useRef(new Set());

const [showScanner, setShowScanner] = useState(false);
useEffect(() => {
  const fetchPlayers = async () => {
    const snap = await getDocs(collection(db, "players"));
    const list = snap.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log("🔥 ALL PLAYERS:", list);
    setAllPlayers(list);
  };

  fetchPlayers();
}, []);


useEffect(() => {
  if (!showScanner || !scanTargetRef.current) return;

  let isCancelled = false;

  const startScan = async () => {
    try {
      qrRef.current = new Html5Qrcode("qr-reader");

      await qrRef.current.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: 250 },
        async (decodedText) => {
  if (isCancelled) return;

  const playerId = decodedText.trim();

  // ⬇️ JANGAN STOP DI SINI

  if (activePlayerIdsRef.current.has(playerId)) {
    alert("Player ini sedang bermain di tempat lain");
    setShowScanner(false);
    scanTargetRef.current = null;
    return;
  }

  const ref = doc(db, "players", playerId);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    alert("Player tidak ditemukan");
    setShowScanner(false);
    scanTargetRef.current = null;
    return;
  }

  setCourt(prev => {
    const target = scanTargetRef.current;
    if (!target) return prev;

    if (prev[target.teamKey].length >= 2) {
      alert("Tim ini sudah penuh");
      return prev;
    }

    return {
      ...prev,
      [target.teamKey]: [
        ...prev[target.teamKey],
        {
          id: playerId,
          name: snap.data().name,
          isVIP: snap.data().isVIP || false,
          photoUrl: snap.data().photoUrl || "",
          badge: snap.data().badge || null,
          slot: SLOT_ORDER[target.slotIndex],
        },
      ],
    };
  });

  activePlayerIdsRef.current.add(playerId);

  // ✅ BARU DI SINI STOP KAMERA
  await qrRef.current.stop();
  await qrRef.current.clear();
  qrRef.current = null;

  setShowScanner(false);
  scanTargetRef.current = null;
}

      );
    } catch (e) {
      console.error(e);
    }
  };

  startScan();

  return () => {
    isCancelled = true;
    if (qrRef.current) {
      qrRef.current.stop().catch(() => {});
      qrRef.current.clear().catch(() => {});
      qrRef.current = null;
    }
  };
}, [showScanner]);



const isFinished = court.finished;
const totalScore = court.score1 + court.score2;
const isMaxScore = totalScore >= 21;
const canAdd = !isFinished && !isMaxScore;
const canFinish = totalScore === 21 && !isFinished;
const winner =
  isFinished
    ? court.score1 > court.score2
      ? "team1"
      : court.score2 > court.score1
      ? "team2"
      : null
    : null;

const openPlayerPicker = (teamKey, slotIndex) => {
  slotTargetRef.current = { teamKey, slotIndex };
  setShowPlayerPicker(true);
};



  const addTeam1 = () => {
  if (!isFinished && !isMaxScore) {
    setCourt(prev => ({ ...prev, score1: prev.score1 + 1 }));

  }
};

const addTeam2 = () => {
  if (!isFinished && !isMaxScore) {
  setCourt(prev => ({ ...prev, score2: prev.score2 + 1 }));

  }
};

const reduceTeam1 = () => {
  if (!isFinished && court.score1 > 0) {
    setCourt(prev => ({ ...prev, score1: prev.score1 - 1 }));
  }
};

const reduceTeam2 = () => {
  if (!isFinished && court.score2 > 0) {
    setCourt(prev => ({ ...prev, score2: prev.score2 - 1 }));
  }
};


  return (
    
    <div
      style={{
        background: "#121212",
        borderRadius: "18px",
        padding: "20px",
        border: "1px solid #222",
        position: "relative",  
        overflow: "hidden",   
      }}
    >
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "14px" }}>
        <strong>{title}</strong>
        <span style={{ 
          fontSize: "12px", 
          color: isFinished ? "#D6C7A1" : "#4FD1C5" }}>
        {isFinished ? "FINISHED" : "ONGOING"}

        </span>
      </div>
<button
  onClick={addTestPlayer}
  style={{
    width: "100%",
    marginBottom: 14,
    padding: "10px",
    borderRadius: 12,
    background: "#0B1F1E",
    color: "#4FD1C5",
    border: "1px dashed #4FD1C5",
    cursor: "pointer",
  }}
>
  + TEST PLAYER
</button>

      {/* TEAMS */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" }}>
        <TeamColumn 
        title="TEAM 1" 
        teamKey="team1"
        players={court.team1} 
        color="#4FD1C5" 
        isWinner={winner === "team1"}
        onSelect={(player) =>
    setActivePlayer({ player, fromTeam: "team1" })}
  setCourt={setCourt}
  
          

 

  isFinished={isFinished}
onEmptySlotClick={openPlayerPicker}
    />
        <TeamColumn 
        title="TEAM 2" 
        teamKey="team2"
        players={court.team2} 
        color="#D6C7A1" 
        isWinner={winner === "team2"}
        onSelect={(player) =>
        setActivePlayer({ player, fromTeam: "team2" })}
        setCourt={setCourt}
        
        onEmptySlotClick={openScannerForSlot}
       
      
        
        isFinished={isFinished}

        />

      </div>

      {/* SCORE */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center" }}>
        {/* TEAM 1 */}
        <div style={{ textAlign: "center" }}>
          <div
            onClick={addTeam1}
            style={{
              fontSize: "38px",
              fontWeight: 700,
              color: canAdd ? "#4FD1C5" : "#555",
              cursor: canAdd ? "pointer" : "not-allowed",
              transition: "transform 0.1s ease",
            }}
          >
            {court.score1}
          </div>

          <button
            onClick={reduceTeam1}
            disabled={court.score1 === 0 || isFinished}
            style={{
              marginTop: "6px",
              padding: "4px 10px",
              fontSize: "12px",
              minWidth: "48px",
              minHeight: "40px",
              borderRadius: "6px",
              border: "1px solid #4FD1C555",
              background: "#0B0B0B",
              color: "#4FD1C5",
              cursor: "pointer",
              boxShadow: "0 0 2px rgba(79,209,197,0.4)",
            }}
          >
            −
          </button>
        </div>

        <div style={{ fontSize: "26px", color: "#555" }}>–</div>

        {/* TEAM 2 */}
        <div style={{ textAlign: "center" }}>
          <div
            onClick={addTeam2}
            style={{
              fontSize: "38px",
              fontWeight: 700,
              color: canAdd ? "#D6C7A1" : "#555",
              cursor: canAdd ? "pointer" : "not-allowed",
              transition: "transform 0.1s ease",
            }}
          >
            {court.score2}
          </div>

          <button
            onClick={reduceTeam2}
  disabled={court.score2 === 0 || isFinished}

  style={{
    marginTop: "8px",
    padding: "10px 16px",
    fontSize: "18px",
    minWidth: "48px",
    minHeight: "40px",
    borderRadius: "10px",
    border: "1px solid #D6C7A1",
    background: "#0B0B0B",
    color: "#D6C7A1",
    cursor: "pointer",
    boxShadow: "0 0 2px rgba(214,199,161,0.4)",
            }}
          >
            −
          </button>
        </div>
      </div>

      {/* TOTAL */}
      <div style={{ textAlign: "center", fontSize: "12px", color: "#777", margin: "10px 0" }}>
        total: {totalScore} / 21
      </div>

     {/* PLAYER ACTION MENU */}
{activePlayer && (
  <div
    style={{
      marginTop: "18px",
      padding: "16px",
      borderRadius: "16px",
      background: "#111",
      border: "1px solid #2A2A2A",
      display: "grid",
      gap: "12px",
      boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
    }}
  >
    <div style={{ 
      fontSize: "13px",
      fontWeight: 600,
      color: "#AAA",
      letterSpacing:"0.5px",
      marginBottom:"4px" }}>
      Player Action
    </div>

    <button

    onTouchStart={(e) => {
  e.currentTarget.style.transform = "scale(0.97)";
}}
onTouchEnd={(e) => {
  e.currentTarget.style.transform = "scale(1)";
}}

      onClick={() => {
        const from = activePlayer.fromTeam;
        const to = from === "team1" ? "team2" : "team1";
         const movingPlayer = {
    id: activePlayer.player.id,
    name: activePlayer.player.name,
    slot: activePlayer.player.slot,
  };
    setCourt(prev => ({
      ...prev,
  [from]: prev[from].filter(p => p.id !== movingPlayer.id),
  [to]: [...prev[to], movingPlayer],
}));
activePlayerIdsRef.current.delete(movingPlayer.id);



        setActivePlayer(null);
      }}
      style={{
    height: "52px",
    borderRadius: "14px",
    border: "1px solid #4FD1C555",
    background: "#0B1F1E",
    color: "#4FD1C5",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
  }}
    >
      Pindah ke tim lain
    </button>

    <button
    onTouchStart={(e) => {
  e.currentTarget.style.transform = "scale(0.97)";
}}
onTouchEnd={(e) => {
  e.currentTarget.style.transform = "scale(1)";
}}

onClick={() => {
  const from = activePlayer.fromTeam;
  const to = from === "team1" ? "team2" : "team1";

  setCourt(prev => {
    // === AMBIL PLAYER ASLI DARI STATE ===
    const movingPlayer = prev[from].find(
      p => p.id === activePlayer.player.id
    );

    if (!movingPlayer) return prev;

    // === SISAKAN TIM ASAL ===
    const fromPlayers = prev[from].filter(
      p => p.id !== movingPlayer.id
    );

    // === TAMBAH KE TIM TUJUAN ===
    const toPlayers = [...prev[to], movingPlayer];

    return {
      ...prev,
      [from]: fromPlayers.map((p, i) => ({
        ...p,
        slot: SLOT_ORDER[i],
      })),
      [to]: toPlayers.map((p, i) => ({
        ...p,
        slot: SLOT_ORDER[i],
      })),
    };
  });


  setActivePlayer(null);
}}





       style={{
    height: "52px",
    borderRadius: "14px",
    border: "1px solid #553333",
    background: "#1A0F0F",
    color: "#FF8A8A",
    fontSize: "15px",
    fontWeight: 600,
    cursor: "pointer",
  }}
    >
      Keluarkan pemain
    </button>

    <button
  onClick={async () => {
    if (qrRef.current) {
      await qrRef.current.stop().catch(() => {});
      await qrRef.current.clear().catch(() => {});
      qrRef.current = null;
    }
    scanTargetRef.current = null;

    setShowScanner(false);
  }}
>
  Batal
</button>


  </div>
)}

{/* FINISH MATCH BUTTON */}

<button
  disabled={!canFinish}
  onClick={() => setCourt(prev => ({ ...prev, finished: true }))}

  style={{
    width: "100%",
    padding: "14px",
    borderRadius: "12px",
    border: "1px solid #333",
    background: canFinish ? "#1F1F1F" : "#0E0E0E",
    color: canFinish ? "#fff" : "#444",
    cursor: canFinish ? "pointer" : "not-allowed",
  }}
>
  FINISH MATCH
</button>
{/* RESET COURT */}
{isFinished && (
  <button
    onClick={() => {
  activePlayerIdsRef.current.clear();
  setCourt({ ...initialCourt });
}}

    
    style={{
      width: "100%",
      marginTop: "10px",
      padding: "12px",
      borderRadius: "12px",
      border: "1px dashed #444",
      background: "#0B0B0B",
      color: "#888",
      fontSize: "13px",
      cursor: "pointer",
      transition: "all 0.15s ease",
    }}
  >
    RESET COURT
  </button>
)}
{showScanner && (
  <div
    style={{
      marginTop: 20,
      padding: 16,
      borderRadius: 16,
      background: "#000",
      textAlign: "center",
    }}
  >
    <div style={{ color: "#fff", marginBottom: 8 }}>
      Arahkan QR ke kamera
    </div>

    <div id="qr-reader" style={{ width: "100%" }} />

    <button
      onClick={() => {
        setShowScanner(false);
       scanTargetRef.current = null;


      }}
      style={{ marginTop: 12 }}
    >
      Batal
    </button>
  
  

  </div>
)}
{showPlayerPicker && (
  <div
    style={{
      position: "absolute",
      inset: 0,
      background: "rgba(0,0,0,0.75)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 50,
    }}
  >

    <div
      style={{
        background: "#121212",
        padding: 24,
        borderRadius: 18,
        minWidth: 300,
        boxShadow: "0 0 40px rgba(79,209,197,0.6)",
      }}
    >
      <div style={{ marginBottom: 12, fontWeight: 600 }}>
        Pilih Pemain
      </div>

      {allPlayers
  .filter(p => p.name && p.name.trim() !== "")
  .map(p => (

        <button
          key={p.id}
          style={{
            width: "100%",
            padding: 10,
            marginBottom: 8,
            borderRadius: 10,
            background: "#0B1F1E",
            color: "#4FD1C5",
            border: "1px solid #4FD1C5",
            cursor: "pointer",
          }}
          onClick={() => {
            const target = slotTargetRef.current;
            if (!target) return;

            setCourt(prev => ({
              ...prev,
              [target.teamKey]: [
                ...prev[target.teamKey],
                {
                  id: p.id,
                  name: p.name,
                  photoUrl: p.photoUrl || "",
                  isVIP: p.isVIP || false,
                  badge: p.badge || null,   // 👑 INI YANG KURANG
                  slot: SLOT_ORDER[target.slotIndex],
                }

              ],
            }));

            setShowPlayerPicker(false);
            slotTargetRef.current = null;
          }}
        >
          {p.name}
        </button>
      ))}

      <button
        style={{
          marginTop: 12,
          width: "100%",
          padding: 10,
          borderRadius: 10,
          background: "#1A0F0F",
          color: "#FF8A8A",
          border: "1px solid #553333",
        }}
        onClick={() => {
          setShowPlayerPicker(false);
          slotTargetRef.current = null;
        }}
      >
        Batal
      </button>
    </div>
  </div>
)}



    </div>
  );
}


function TeamColumn({
  title,
  players,
  teamKey,
  color,
  isWinner,
  onSelect,
  isFinished,
  onEmptySlotClick,
}) {

 
  const MAX_PLAYER = 2;
  const emptyCount = Math.max(0, MAX_PLAYER - players.length);

  return (
    <div>
      <div style={{ display: "grid", gap: "10px" }}>

 {/* PLAYER */}
{players.map((p) => {
  const slotColor = p.slot ? SLOT_COLORS[p.slot] : null;

  return (
    <div
      key={p.id}
      onClick={() => {
  if (isFinished) return;
  onSelect?.(p);
}}

      style={{
        background: slotColor ? slotColor.bg : "#0B0B0B",
        padding: "16px",
        borderRadius: "14px",
        textAlign: "center",
        fontWeight: 600,
        color: slotColor ? slotColor.text : color,
        border: slotColor
          ? `1px solid ${slotColor.border}`
          : "1px solid #111",
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
  {p.photoUrl && (
    <img
  src={p.photoUrl || "/avatar-placeholder.png"}
  alt={p.name}
  style={{
    width: 36,
    height: 36,
    borderRadius: "50%",
    objectFit: "cover",
    background: "#222",
    position: "relative",
    overflow: "hidden",
  
  }}
/>

  )}

  <div>
  <div>{p.name}</div>

  {/* 👑 QUEEN BADGE */}
  {p.badge === "queen" && (
    <div
      style={{
        marginTop: 2,
        fontSize: 11,
        color: "#FF6BFF",
        fontWeight: 600,
        textShadow: "0 0 6px rgba(255,107,255,0.8)",
      }}
    >
      👑 QUEEN
    </div>
  )}

  {/* ⭐ VIP (tetap ada kalau mau) */}
  {p.isVIP && (
    <div style={{ fontSize: 11, color: "#FFD700" }}>
      ⭐ VIP
    </div>
  )}
</div>

</div>

    </div>
  );
})}

{/* SLOT KOSONG */}
{Array.from({ length: 2 - players.length }).map((_, i) => (
  <div
    key={`empty-${i}`}


    onClick={() => {
  onEmptySlotClick(teamKey, players.length + i);
}}






    style={{
      padding: "16px",
      borderRadius: "14px",
      textAlign: "center",
      color: "#777",
      border: "2px dashed #444",
      cursor: "pointer",
    }}
  >
    + SLOT KOSONG
  </div>
))}


</div>
</div>
  );}

function ScoreControl({ label, onClick, disabled, color }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: "12px",
        borderRadius: "10px",
        fontSize: "13px",
        fontWeight: 600,
        border: `1px solid ${color}55`,
        background: disabled ? "#111" : "#0B0B0B",
        color: disabled ? "#555" : color,
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "all 0.15s ease",
      }}
    >
      {label}
    </button>
  );
}

function InfoCard({ title, children }) {
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

function InfoRow({ left, right, badge }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "12px 0",
        borderBottom: "1px solid #222",
      }}
    >
      <span
        style={{
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
          maxWidth: "65%",
        }}
      >
        {left}
      </span>

      <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
        <span style={{ color: "#9A9A9A" }}>{right}</span>

        {badge && (
          <span
            style={{
              fontSize: "11px",
              padding: "3px 10px",
              borderRadius: "999px",
              border: "1px solid #4FD1C5",
              color: "#4FD1C5",
              whiteSpace: "nowrap",
            }}
          >
            {badge}
          </span>
        )}
      </div>
    </div>
  );
}
<style jsx global>{
`
/* =========================
   QUEEN BADGE – GOLD WHITE
========================= */

.queen-badge {
  margin-top: 4px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.6px;
  color: #FFF8DC; /* ivory white */

  text-shadow:
    0 0 4px rgba(255,255,255,0.9),
    0 0 8px rgba(255,215,0,0.7),
    0 0 14px rgba(255,215,0,0.5);

  animation: queenGlow 2.4s ease-in-out infinite;
}

/* ✨ GOLD–WHITE SOFT GLOW */
@keyframes queenGlow {
  0% {
    text-shadow:
      0 0 3px rgba(255,255,255,0.8),
      0 0 6px rgba(255,215,0,0.5),
      0 0 10px rgba(255,215,0,0.35);
  }

  50% {
    text-shadow:
      0 0 6px rgba(255,255,255,1),
      0 0 14px rgba(255,215,0,1),
      0 0 22px rgba(255,215,0,0.85);
  }

  100% {
    text-shadow:
      0 0 3px rgba(255,255,255,0.8),
      0 0 6px rgba(255,215,0,0.5),
      0 0 10px rgba(255,215,0,0.35);
  }
}

@keyframes winnerGlow {
  0% {
    box-shadow:
      0 0 12px rgba(255,255,255,0.25),
      0 0 24px rgba(255,255,255,0.25);
  }
  50% {
    box-shadow:
      0 0 22px rgba(255,255,255,0.6),
      0 0 48px rgba(255,255,255,0.6);
  }
  100% {
    box-shadow:
      0 0 12px rgba(255,255,255,0.25),
      0 0 24px rgba(255,255,255,0.25);
  }
}
`}</style>
