"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { collection, doc, getDoc, getDocs, updateDoc } from "firebase/firestore";
import { db } from "../../../../firebase";
import { HOST_AUTH_KEY } from "../../../lib/dashboard";

const MONTHS = "Jan Feb Mar Apr Mei Jun Jul Agt Sep Okt Nov Des".split(" ");

function formatDayKey(dayKey) {
  if (!dayKey || dayKey.length < 10) return dayKey;
  const [y, m, d] = dayKey.split("-");
  const mi = parseInt(m, 10) - 1;
  return `${parseInt(d, 10)} ${MONTHS[mi]} ${y}`;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildBracketMatches(teams, jumlahTim) {
  let n = Math.min(teams.length, jumlahTim || 8);
  if (n < 2) return [];
  if (n % 2 !== 0) n -= 1;
  if (n < 2) return [];
  const shuffled = shuffle(teams.slice(0, n));
  const teamToIds = (t) => [t.player1Id, t.player2Id].filter(Boolean);
  const matches = [];
  let numInRound = n / 2;
  let round = 0;
  while (numInRound >= 1) {
    for (let slot = 0; slot < numInRound; slot++) {
      const isFirstRound = round === 0;
      matches.push({
        round,
        slot,
        team1Ids: isFirstRound ? teamToIds(shuffled[slot * 2]) : null,
        team2Ids: isFirstRound ? teamToIds(shuffled[slot * 2 + 1]) : null,
        score1: null,
        score2: null,
        winner: null,
      });
    }
    numInRound = Math.floor(numInRound / 2);
    round++;
  }
  return matches;
}

function getNextMatch(round, slot, maxRound) {
  if (round >= maxRound) return null;
  return {
    round: round + 1,
    slot: Math.floor(slot / 2),
    side: slot % 2 === 0 ? "team1" : "team2",
  };
}

function matchIndex(matches, round, slot) {
  return matches.findIndex((m) => m.round === round && m.slot === slot);
}

export default function TurnamenBaganPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;
  const [hostChecked, setHostChecked] = useState(false);
  const [tournament, setTournament] = useState(null);
  const [nameMap, setNameMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [registerLink, setRegisterLink] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!sessionStorage.getItem(HOST_AUTH_KEY)) {
      router.replace("/host");
      return;
    }
    setHostChecked(true);
  }, [router]);

  useEffect(() => {
    if (!hostChecked || !id) return;
    setLoading(true);
    setError("");
    const load = async () => {
      try {
        const [tourSnap, playersSnap] = await Promise.all([
          getDoc(doc(db, "tournaments", id)),
          getDocs(collection(db, "players")),
        ]);
        if (!tourSnap.exists()) {
          setError("Turnamen tidak ditemukan.");
          setTournament(null);
          setLoading(false);
          return;
        }
        const data = tourSnap.data();
        let bracket = data.bracket || {};
        const teams = data.teams || [];
        const jumlahTim = Number(data.jumlahTim) || 8;
        if (teams.length >= 2 && (!bracket.matches || bracket.matches.length === 0)) {
          const matches = buildBracketMatches(teams, jumlahTim);
          await updateDoc(doc(db, "tournaments", id), { bracket: { matches } });
          bracket = { matches };
        }
        setTournament({ id: tourSnap.id, ...data, bracket });
        if (data.code && typeof window !== "undefined") {
          setRegisterLink(`${window.location.origin}/turnamen/daftar?code=${data.code}`);
        }
        const map = {};
        playersSnap.docs.forEach((d) => {
          map[d.id] = d.data().name || d.id;
        });
        setNameMap(map);
      } catch (e) {
        console.error(e);
        setError("Gagal memuat. Cek koneksi.");
        setTournament(null);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [hostChecked, id]);

  const matches = useMemo(() => tournament?.bracket?.matches || [], [tournament?.bracket?.matches]);
  const rounds = useMemo(() => {
    if (!matches.length) return [];
    const r = [];
    let round = 0;
    while (matches.some((m) => m.round === round)) {
      r.push(matches.filter((m) => m.round === round));
      round++;
    }
    return r;
  }, [matches]);

  const teamLabel = (ids) => {
    if (!ids || ids.length === 0) return "–";
    return ids.map((id) => nameMap[id] || id).join(" + ");
  };

  const [savingMatch, setSavingMatch] = useState(null);
  const saveScore = async (matchIdx, score1, score2) => {
    const s1 = Number(score1);
    const s2 = Number(score2);
    if (matchIdx < 0 || matchIdx >= matches.length) return;
    const m = matches[matchIdx];
    const winner = s1 > s2 ? "team1" : s2 > s1 ? "team2" : null;
    const maxRound = matches.length ? Math.max(...matches.map((x) => x.round)) : 0;
    const next = getNextMatch(m.round, m.slot, maxRound);
    const newMatches = matches.map((match, i) => {
      if (i !== matchIdx) return match;
      return { ...match, score1: s1, score2: s2, winner };
    });
    if (next && winner) {
      const nextIdx = matchIndex(newMatches, next.round, next.slot);
      if (nextIdx >= 0) {
        const winnerIds = winner === "team1" ? m.team1Ids : m.team2Ids;
        newMatches[nextIdx] = {
          ...newMatches[nextIdx],
          [next.side + "Ids"]: winnerIds,
        };
      }
    }
    setSavingMatch(matchIdx);
    try {
      await updateDoc(doc(db, "tournaments", id), { bracket: { matches: newMatches } });
      setTournament((prev) => (prev ? { ...prev, bracket: { matches: newMatches } } : null));
    } catch (e) {
      console.error(e);
    } finally {
      setSavingMatch(null);
    }
  };

  if (!hostChecked) return null;

  const teams = tournament?.teams || [];
  const maxTim = Number(tournament?.jumlahTim) || 8;

  return (
    <main
      style={{
        minHeight: "100vh",
        minWidth: "100vw",
        background: "#0B0B0B",
        color: "#fff",
        padding: "max(24px, env(safe-area-inset-top)) max(24px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(24px, env(safe-area-inset-left))",
        fontFamily: "Inter, system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: "560px", margin: "0 auto", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
          <h1 style={{ margin: 0, fontSize: "22px", color: "#E8FFF9" }}>Bagan turnamen</h1>
          <Link
            href="/turnamen"
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
            ← Lomba
          </Link>
        </div>

        {loading && <p style={{ color: "#9A9A9A", textAlign: "center", padding: "24px" }}>Memuat...</p>}
        {error && <p style={{ color: "#FF6B6B", marginBottom: "16px" }}>{error}</p>}

        {!loading && tournament && (
          <>
            <section
              style={{
                marginBottom: "24px",
                padding: "16px",
                background: "#121212",
                borderRadius: "12px",
                border: "1px solid #222",
              }}
            >
              <h2 style={{ margin: "0 0 8px", fontSize: "18px", color: "#fff" }}>{tournament.namaTurnamen || "Turnamen"}</h2>
              <p style={{ margin: 0, fontSize: "13px", color: "#888" }}>
                {formatDayKey(tournament.tanggalMulai)} – {formatDayKey(tournament.tanggalSelesai)} · {maxTim} tim
              </p>
            </section>

            <section
              style={{
                marginBottom: "24px",
                padding: "16px",
                background: "rgba(79, 209, 197, 0.1)",
                borderRadius: "12px",
                border: "1px solid #2d6a64",
              }}
            >
              <h2 style={{ margin: "0 0 12px", fontSize: "14px", color: "#4FD1C5", letterSpacing: "0.05em" }}>KODE TURNAMEN (untuk pendaftaran di meja)</h2>
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "12px", marginBottom: "8px" }}>
                <p style={{ margin: 0, fontSize: "24px", fontWeight: 700, letterSpacing: "0.2em", color: "#9FF5EA" }}>
                  {tournament.code || "–"}
                </p>
                {registerLink && (
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(registerLink).then(() => {
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      });
                    }}
                    style={{
                      padding: "10px 16px",
                      background: "#0B2A28",
                      border: "1px solid #4FD1C5",
                      borderRadius: "10px",
                      color: "#9FF5EA",
                      fontSize: "14px",
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {copied ? "Tersalin!" : "Link turnamen"}
                  </button>
                )}
              </div>
              <p style={{ margin: 0, fontSize: "12px", color: "#888" }}>
                Berikan kode ini ke panitia meja atau peserta untuk daftar. Klik &quot;Link turnamen&quot; untuk menyalin link, lalu tempel (paste) di mana saja.
              </p>
              {registerLink && (
                <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                  <p style={{ margin: 0, fontSize: "12px", color: "#888" }}>Scan untuk buka halaman pendaftaran</p>
                  <div style={{ padding: "12px", background: "#fff", borderRadius: "12px", display: "inline-flex" }}>
                    <QRCodeSVG value={registerLink} size={180} level="M" bgColor="#ffffff" fgColor="#0B0B0B" />
                  </div>
                </div>
              )}
            </section>

            <section
              style={{
                marginBottom: "24px",
                padding: "16px",
                background: "#121212",
                borderRadius: "12px",
                border: "1px solid #222",
              }}
            >
              <h2 style={{ margin: "0 0 12px", fontSize: "14px", color: "#4FD1C5", letterSpacing: "0.05em" }}>TIM TERDAFTAR ({teams.length} / {maxTim})</h2>
              {teams.length === 0 ? (
                <p style={{ color: "#888", fontSize: "14px" }}>Belum ada tim terdaftar.</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {teams.map((team, i) => (
                    <div
                      key={i}
                      style={{
                        padding: "12px 14px",
                        background: "#0B0B0B",
                        borderRadius: "10px",
                        border: "1px solid #2a2a2a",
                        fontSize: "14px",
                        color: "#fff",
                      }}
                    >
                      <strong>Tim {i + 1}:</strong> {nameMap[team.player1Id] || team.player1Id} + {nameMap[team.player2Id] || team.player2Id}
                    </div>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      {!loading && tournament && matches.length > 0 && (
        <section
          style={{
            marginTop: "8px",
            marginBottom: "24px",
            padding: "16px",
            background: "#121212",
            borderRadius: "12px",
            border: "1px solid #222",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <h2 style={{ margin: "0 0 8px", fontSize: "14px", color: "#4FD1C5", letterSpacing: "0.05em", textAlign: "center" }}>BAGAN PERTANDINGAN</h2>
          <p style={{ margin: "0 0 16px", fontSize: "12px", color: "#888", textAlign: "center" }}>
            Isi skor di setiap kotak, lalu simpan. Pemenang otomatis masuk ke kotak berikutnya. Geser ke samping untuk bagan penuh (landscape).
          </p>
          <div style={{ overflowX: "auto", paddingBottom: "16px", WebkitOverflowScrolling: "touch" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0",
                minWidth: "max-content",
                padding: "8px 24px",
                justifyContent: "flex-start",
              }}
            >
                    {rounds.map((roundMatches, roundIdx) => (
                      <div key={roundIdx} style={{ display: "flex", alignItems: "center", gap: "0" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "center", padding: "0 8px" }}>
                          <div style={{ fontSize: "12px", color: "#888", marginBottom: "4px" }}>
                            {roundIdx === rounds.length - 1
                              ? "Final"
                              : roundIdx === rounds.length - 2
                                ? "Semi"
                                : `R${roundIdx + 1}`}
                          </div>
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: roundMatches.length <= 2 ? "48px" : "24px",
                              justifyContent: "space-around",
                              minHeight: roundMatches.length <= 2 ? 120 : roundMatches.length * 96,
                            }}
                          >
                            {roundMatches.map((m) => {
                              const matchIdx = matches.findIndex((x) => x.round === m.round && x.slot === m.slot);
                              return (
                                <MatchBox
                                  key={`${m.round}-${m.slot}`}
                                  team1Label={teamLabel(m.team1Ids)}
                                  team2Label={teamLabel(m.team2Ids)}
                                  score1={m.score1}
                                  score2={m.score2}
                                  onSave={(s1, s2) => saveScore(matchIdx, s1, s2)}
                                  saving={savingMatch === matchIdx}
                                />
                              );
                            })}
                          </div>
                        </div>
                        {roundIdx < rounds.length - 1 && (
                          <BracketConnector
                            fromCount={roundMatches.length}
                            toCount={rounds[roundIdx + 1]?.length ?? 0}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
          </section>
      )}
    </main>
  );
}

function BracketConnector({ fromCount, toCount }) {
  const w = 40;
  const h = Math.max(120, fromCount * 96);
  const fromYs = Array.from({ length: fromCount }, (_, i) => (i + 0.5) * (h / fromCount));
  const toYs = Array.from({ length: toCount }, (_, i) => (i + 0.5) * (h / toCount));
  const midX = w / 2;
  const paths = [];
  for (let i = 0; i < fromCount; i++) {
    const toI = Math.floor((i / fromCount) * toCount);
    const toY = toYs[Math.min(toI, toCount - 1)];
    paths.push(`M 0 ${fromYs[i]} L ${midX} ${fromYs[i]} L ${midX} ${toY} L ${w} ${toY}`);
  }
  return (
    <svg width={w} height={h} style={{ flexShrink: 0 }} viewBox={`0 0 ${w} ${h}`}>
      {paths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="#4FD1C5" strokeWidth="1.5" opacity={0.8} />
      ))}
    </svg>
  );
}

function MatchBox({ team1Label, team2Label, score1, score2, onSave, saving }) {
  const [s1, setS1] = useState(score1 != null ? String(score1) : "");
  const [s2, setS2] = useState(score2 != null ? String(score2) : "");
  useEffect(() => {
    setS1(score1 != null ? String(score1) : "");
    setS2(score2 != null ? String(score2) : "");
  }, [score1, score2]);
  return (
    <div
      style={{
        padding: "12px 14px",
        background: "#0B0B0B",
        borderRadius: "10px",
        border: "1px solid #333",
        minWidth: "200px",
      }}
    >
      <div style={{ fontSize: "13px", color: "#fff", marginBottom: "8px" }}>{team1Label}</div>
      <div style={{ fontSize: "11px", color: "#666", marginBottom: "4px" }}>vs</div>
      <div style={{ fontSize: "13px", color: "#fff", marginBottom: "10px" }}>{team2Label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <input
          type="number"
          min={0}
          value={s1}
          onChange={(e) => setS1(e.target.value)}
          placeholder="0"
          style={{
            width: "48px",
            padding: "6px 8px",
            background: "#1a1a1a",
            border: "1px solid #444",
            borderRadius: "6px",
            color: "#fff",
            fontSize: "14px",
            textAlign: "center",
          }}
        />
        <span style={{ color: "#666" }}>–</span>
        <input
          type="number"
          min={0}
          value={s2}
          onChange={(e) => setS2(e.target.value)}
          placeholder="0"
          style={{
            width: "48px",
            padding: "6px 8px",
            background: "#1a1a1a",
            border: "1px solid #444",
            borderRadius: "6px",
            color: "#fff",
            fontSize: "14px",
            textAlign: "center",
          }}
        />
        <button
          type="button"
          onClick={() => onSave(s1, s2)}
          disabled={saving}
          style={{
            padding: "6px 12px",
            background: "#1a3a3a",
            border: "1px solid #4FD1C5",
            borderRadius: "8px",
            color: "#4FD1C5",
            fontSize: "12px",
            cursor: saving ? "wait" : "pointer",
          }}
        >
          {saving ? "..." : "Simpan"}
        </button>
      </div>
    </div>
  );
}
