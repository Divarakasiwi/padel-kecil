/**
 * Konstanta dan helper untuk dashboard (court, match queue, storage).
 */

export const HOST_AUTH_KEY = "padelkecil:host:auth";

export const SLOT_ORDER = ["A", "B", "C", "D"];

export const SLOT_COLORS = {
  A: { bg: "#2A0F0F", border: "#FF6B6B", text: "#FFB3B3" },
  B: { bg: "#0F1A2A", border: "#4DA3FF", text: "#B3D9FF" },
  C: { bg: "#102016", border: "#4FD1C5", text: "#9FF5EA" },
  D: { bg: "#221A0A", border: "#E6C36A", text: "#FFF1B8" },
};

/** Pool 50 warna satu keluarga tema (teal/gold). Setiap pemain di semua court dapat warna unik. */
export const PALETTE = [
  { bg: "#0B1F1E", border: "#2D6A64", text: "#7ED4CC" },
  { bg: "#0F2A28", border: "#3D7A73", text: "#9FF5EA" },
  { bg: "#102016", border: "#2D5A4E", text: "#6EC4B0" },
  { bg: "#0D2420", border: "#2A6B5E", text: "#8AE0D0" },
  { bg: "#132A26", border: "#3B8075", text: "#9AE8DC" },
  { bg: "#1A2E28", border: "#358872", text: "#7EE8D4" },
  { bg: "#0E1E1C", border: "#2B5C56", text: "#7ACFC6" },
  { bg: "#152822", border: "#2E7268", text: "#88E5D9" },
  { bg: "#1B322C", border: "#3A8A7C", text: "#8FEDE0" },
  { bg: "#112420", border: "#266358", text: "#6DD4C4" },
  { bg: "#1E2A1A", border: "#3D5C2E", text: "#8BC47A" },
  { bg: "#252A18", border: "#4A5C2E", text: "#9FD87A" },
  { bg: "#2A2818", border: "#5C5828", text: "#C4C078" },
  { bg: "#2C2614", border: "#5A5020", text: "#C4B068" },
  { bg: "#2A2212", border: "#5C4A18", text: "#D4B858" },
  { bg: "#2E2614", border: "#6A5820", text: "#E6C36A" },
  { bg: "#2C2416", border: "#5E5028", text: "#D6C7A1" },
  { bg: "#2A2818", border: "#5A5830", text: "#D4D0A8" },
  { bg: "#262818", border: "#4E5430", text: "#B8C490" },
  { bg: "#1E2A1C", border: "#3A5430", text: "#8FC47A" },
  { bg: "#182A20", border: "#2E5C42", text: "#7AD49A" },
  { bg: "#142A24", border: "#285C4E", text: "#6ED4B0" },
  { bg: "#122824", border: "#265852", text: "#6ECCC4" },
  { bg: "#142628", border: "#285058", text: "#6EC4CC" },
  { bg: "#16242A", border: "#2A4A5C", text: "#7AB8D4" },
  { bg: "#1A202A", border: "#2E4058", text: "#7AA8CC" },
  { bg: "#1C1E2A", border: "#323858", text: "#8A98C8" },
  { bg: "#201C2A", border: "#3E3260", text: "#9A8EC4" },
  { bg: "#241A2A", border: "#4A2E60", text: "#B08AC4" },
  { bg: "#2A1828", border: "#5A2860", text: "#C88AC8" },
  { bg: "#2A1424", border: "#5C2850", text: "#D48AB0" },
  { bg: "#2A161C", border: "#5C2838", text: "#D48A98" },
  { bg: "#2A1A18", border: "#5A3028", text: "#D49A88" },
  { bg: "#2C2218", border: "#5E4028", text: "#D4B088" },
  { bg: "#2A2618", border: "#5A4E28", text: "#C8B878" },
  { bg: "#242818", border: "#4A5228", text: "#A8B868" },
  { bg: "#1C2A1A", border: "#385828", text: "#88C078" },
  { bg: "#162A1E", border: "#2A5C38", text: "#78C890" },
  { bg: "#122A22", border: "#245C48", text: "#70CC9E" },
  { bg: "#102824", border: "#205850", text: "#68CCB0" },
  { bg: "#0E2628", border: "#1E5058", text: "#68C4C4" },
  { bg: "#122228", border: "#224858", text: "#68B4CC" },
  { bg: "#161E2A", border: "#283E58", text: "#70A4D0" },
  { bg: "#1A1A2A", border: "#2E3658", text: "#8094D0" },
  { bg: "#1E1628", border: "#362E58", text: "#9088D4" },
  { bg: "#221428", border: "#402658", text: "#A078D4" },
  { bg: "#26122A", border: "#4A2058", text: "#B068CC" },
  { bg: "#28162A", border: "#522050", text: "#C068B8" },
  { bg: "#2A1828", border: "#562840", text: "#CC70A8" },
  { bg: "#2C1C24", border: "#5A3040", text: "#D08898" },
  { bg: "#2C201C", border: "#5A4030", text: "#CC9C88" },
];

const PALETTE_SIZE = PALETTE.length;

/** Mengembalikan satu warna acak dari pool yang belum dipakai. usedIndices = Set<number>. */
export function getRandomUnusedColor(usedIndices) {
  const used = usedIndices instanceof Set ? usedIndices : new Set(usedIndices ?? []);
  const available = [];
  for (let i = 0; i < PALETTE_SIZE; i++) {
    if (!used.has(i)) available.push(i);
  }
  if (available.length === 0) return null;
  const idx = available[Math.floor(Math.random() * available.length)];
  return { colorIndex: idx, ...PALETTE[idx] };
}

export const MATCH_QUEUE_KEY = "padelkecil:matches:queue";

export const initialCourtState = {
  team1: [],
  team2: [],
  score1: 0,
  score2: 0,
  finished: false,
  note: "",
};

export function getTodayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function loadMatchQueue() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MATCH_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveMatchQueue(queue) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(MATCH_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // ignore storage error
  }
}
