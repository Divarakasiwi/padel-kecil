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

export const MATCH_QUEUE_KEY = "padelkecil:matches:queue";

export const initialCourtState = {
  team1: [],
  team2: [],
  score1: 0,
  score2: 0,
  finished: false,
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
