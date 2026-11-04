// ============================================================
// LOCAL-FIRST DATA STORE
// ------------------------------------------------------------
// Everything lives in one in-memory object that is mirrored to
// localStorage. Every service function changes data ONLY through
// `mutate()`, and every screen reads ONLY through `useDb()`.
// That means moving to a backend only requires changing this file.
//
// SERVERLESS / API MIGRATION (Firebase, Supabase, AWS, REST...):
//  1. Reads:  replace `load()` with a fetch (or a realtime listener such as
//             Firestore onSnapshot / Supabase realtime) and call `emit()`
//             whenever new data arrives.
//  2. Writes: inside `mutate()`, keep the optimistic update below, then send
//             the change to the server, e.g. `api.post("/mutations", {...})`
//             or call a cloud function per service action (see the
//             "SERVERLESS" notes at the top of each file in /services).
//  3. Security: the checks in permissions.ts must be repeated on the server
//             (security rules / Row Level Security / Lambda authorizers).
//             The client check is only for UX, never for protection.
//  4. Split `HealthDb` per role: the backend should only return the records
//             that the signed-in role is allowed to see.
// ============================================================
import { useSyncExternalStore } from "react";
import type { HealthDb } from "./types";
import { seedDb } from "./data/sampleData";

const STORAGE_KEY = "healthcare.db.v1";
const listeners = new Set<() => void>();

function load(): HealthDb {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as HealthDb;
  } catch {
    /* ignore corrupt storage and fall back to seed */
  }
  return structuredClone(seedDb);
}

let db: HealthDb = load();

const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

export const getDb = () => db;
export const useDb = () => useSyncExternalStore(subscribe, getDb);

/** Apply a change immutably so React re-renders. */
export function mutate(change: (draft: HealthDb) => void) {
  const next = structuredClone(db);
  change(next);
  db = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    /* storage full or blocked: keep working in memory */
  }
  emit();
  // SERVERLESS: send the mutation to your backend here (see header notes).
}

/** Restore the sample data (handy while designing). */
export function resetDb() {
  db = structuredClone(seedDb);
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* noop */ }
  emit();
}
