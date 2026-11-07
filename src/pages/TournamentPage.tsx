import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { ChangeEvent, CSSProperties, DragEvent } from "react";
import { useNavigate } from "react-router-dom";
import { FloatingButton } from "../theme/FloatingButton";
import { AppColors, AppPalette, AppSpacing } from "../theme/tokens";
import { useResponsive } from "../theme/responsive";
import { NeoButton, NeoChip, NeoDialog, NeoEmpty, NeoSection, WireFrameFrosted } from "../theme/AppTheme";
import { useAppTheme } from "../theme/useAppTheme";
import { dotBackground } from "../theme/background";

/* ═════════════════════════════════════════════════════════════════════════════
   MODEL
   ═════════════════════════════════════════════════════════════════════════════ */

type Status = "setup" | "running" | "paused" | "stopped" | "completed";
type BracketType = "singleElimination" | "swiss";
type ByeMode = "none" | "automatic" | "custom";

interface Player {
  id: string;
  name: string;
  seed: number;
}

interface Match {
  id: string;
  group: number;
  round: number;
  slot: number;
  playerA: string | null;
  playerB: string | null;
  winnerId: string | null;
  scoreA: number | null;
  scoreB: number | null;
  notes: string | null;
}

interface Snapshot {
  type: BracketType | null;
  players: Player[];
  matches: Match[];
  history: string[];
  round: number;
  rounds: number;
  bracketCount: number;
  status: Status;
  byeMode: ByeMode;
  customByeCount: number;
}

interface Standing {
  player: Player;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  history: string[];
  matchPoints: number;
  pointDifference: number;
  buchholz: number;
}

const newMatch = (
  id: string,
  group: number,
  round: number,
  slot: number,
  playerA: string | null = null,
  playerB: string | null = null,
): Match => ({ id, group, round, slot, playerA, playerB, winnerId: null, scoreA: null, scoreB: null, notes: null });

const copyPlayer = (p: Player): Player => ({ ...p });
const copyMatch = (m: Match): Match => ({ ...m });
const nextPow2 = (v: number) => {
  let r = 1;
  while (r < v) r *= 2;
  return r;
};
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
const uid = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
const MAX_PLAYERS = 150;
const STORAGE_KEY = "tournament_session_state";

/* ═════════════════════════════════════════════════════════════════════════════
   CONTROLLER (plain TS, mutable, observed through useSyncExternalStore)
   ═════════════════════════════════════════════════════════════════════════════ */

class TournamentController {
  players: Player[] = [];
  matches: Match[] = [];
  archivedMatches: Match[] = [];
  archivedPlayerNames: Record<string, string> = {};
  history: string[] = [];
  seconds = 0;
  bracketCount = 1;
  customMatching = false;
  status: Status = "setup";
  bracketType: BracketType | null = null;
  tournamentNameRaw = "Tournament";
  swissRounds = 3;
  swissRound = 0;
  swissAdvanceCount = 0;
  swissAdvanceConfigured = false;
  byeMode: ByeMode = "automatic";
  customByeCount = 0;
  swissStage: Snapshot | null = null;
  singleEliminationStage: Snapshot | null = null;

  private version = 0;
  private listeners = new Set<() => void>();
  private timer: number | null = null;

  constructor() {
    this.load();
  }

  /* ── store plumbing ── */
  subscribe = (fn: () => void) => {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  };
  getVersion = () => this.version;

  notify() {
    this.version++;
    this.persist();
    this.listeners.forEach((fn) => fn());
  }

  /** Call from useEffect. Idempotent, so StrictMode's mount/unmount/mount is safe. */
  mount() {
    if (this.status === "running") this.startTimer();
  }
  dispose() {
    this.stopTimer();
  }

  /* ── persistence (localStorage replaces SharedPreferences) ── */
  private persist() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          players: this.players,
          matches: this.matches,
          archivedMatches: this.archivedMatches,
          archivedPlayerNames: this.archivedPlayerNames,
          history: this.history,
          seconds: this.seconds,
          bracketCount: this.bracketCount,
          customMatching: this.customMatching,
          status: this.status,
          bracketType: this.bracketType,
          tournamentName: this.tournamentNameRaw,
          swissRounds: this.swissRounds,
          swissRound: this.swissRound,
          swissAdvanceCount: this.swissAdvanceCount,
          swissAdvanceConfigured: this.swissAdvanceConfigured,
          byeMode: this.byeMode,
          customByeCount: this.customByeCount,
          swissStage: this.swissStage,
          singleEliminationStage: this.singleEliminationStage,
        }),
      );
    } catch {
      /* storage full or blocked: keep running in memory */
    }
  }

  private load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      this.players = d.players ?? [];
      this.matches = d.matches ?? [];
      this.archivedMatches = d.archivedMatches ?? [];
      this.archivedPlayerNames = d.archivedPlayerNames ?? {};
      this.history = d.history ?? [];
      this.seconds = d.seconds ?? 0;
      this.bracketCount = d.bracketCount ?? 1;
      this.customMatching = d.customMatching ?? false;
      this.status = d.status ?? "setup";
      this.bracketType = d.bracketType ?? null;
      this.tournamentNameRaw = d.tournamentName ?? "Tournament";
      this.swissRounds = d.swissRounds ?? 3;
      this.swissRound = d.swissRound ?? 0;
      this.swissAdvanceCount = d.swissAdvanceCount ?? 0;
      this.swissAdvanceConfigured = d.swissAdvanceConfigured ?? false;
      this.byeMode = d.byeMode ?? "automatic";
      this.customByeCount = d.customByeCount ?? 0;
      this.swissStage = d.swissStage ?? null;
      this.singleEliminationStage = d.singleEliminationStage ?? null;
    } catch {
      /* corrupt state: start fresh */
    }
  }

  /* ── timer ── */
  private startTimer() {
    if (this.timer !== null) return;
    this.timer = window.setInterval(() => {
      if (this.status === "running") {
        this.seconds++;
        this.notify();
      }
    }, 1000);
  }
  private stopTimer() {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  /* ── derived ── */
  get tournamentName() {
    return this.tournamentNameRaw.trim() || "Tournament";
  }
  get elapsedLabel() {
    const m = String(Math.floor(this.seconds / 60)).padStart(2, "0");
    const s = String(this.seconds % 60).padStart(2, "0");
    return `${m}:${s}`;
  }
  playerById = (id: string | null): Player | undefined =>
    id === null ? undefined : this.players.find((p) => p.id === id);
  get canClear() {
    return this.status === "setup";
  }
  get hasBracket() {
    return this.matches.length > 0;
  }
  get hasExportData() {
    return (
      this.matches.length > 0 ||
      this.archivedMatches.length > 0 ||
      this.swissStage !== null ||
      this.singleEliminationStage !== null
    );
  }
  get hasHistory() {
    return this.history.length > 0;
  }
  get isSwiss() {
    return this.bracketType === "swiss";
  }
  get hasStageTabs() {
    return this.swissStage !== null && this.singleEliminationStage !== null;
  }
  get swissComplete() {
    return (
      this.isSwiss &&
      this.swissRound >= this.swissRounds &&
      this.matches.filter((m) => m.group === 0).every((m) => m.winnerId !== null)
    );
  }
  get isComplete() {
    if (this.matches.length === 0) return false;
    if (this.isSwiss) return this.swissComplete;
    const finals = this.matches.filter(
      (m) => !this.isThird(m) && !this.matches.some((o) => o.group === m.group && o.round === m.round + 1),
    );
    const thirdsDone = this.matches
      .filter((m) => this.isThird(m))
      .every((t) => t.winnerId !== null || this.thirdDormant(t));
    return finals.length > 0 && finals.every((m) => m.winnerId !== null) && thirdsDone;
  }
  get automaticByeCount() {
    if (this.players.length < 2) return 0;
    return nextPow2(this.players.length) - this.players.length;
  }
  get groups(): number[] {
    return [...new Set(this.matches.map((m) => m.group))].sort((a, b) => a - b);
  }

  matchesForGroup(group: number): Match[][] {
    const grouped = new Map<number, Match[]>();
    for (const m of this.matches) {
      if (m.group !== group || this.isThird(m)) continue;
      if (!grouped.has(m.round)) grouped.set(m.round, []);
      grouped.get(m.round)!.push(m);
    }
    return [...grouped.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([, list]) => list.sort((a, b) => a.slot - b.slot));
  }

  private feeders(match: Match): [Match | undefined, Match | undefined] {
    if (match.round === 0) return [undefined, undefined];
    return [
      this.matches.find((f) => f.group === match.group && f.round === match.round - 1 && f.slot === match.slot * 2),
      this.matches.find((f) => f.group === match.group && f.round === match.round - 1 && f.slot === match.slot * 2 + 1),
    ];
  }
  private nextMatch(match: Match) {
    return this.matches.find(
      (n) => n.group === match.group && n.round === match.round + 1 && n.slot === Math.floor(match.slot / 2),
    );
  }

  /* ── 3rd place helpers ── */
  isThird = (m: Match) => m.id.endsWith("-third");
  thirdPlaceMatch(group: number): Match | undefined {
    return this.matches.find((m) => m.group === group && this.isThird(m));
  }
  private semisOf(third: Match) {
    return this.matches.filter((m) => m.group === third.group && m.round === third.round - 1);
  }
  /** True when the 3rd place match can never be played (e.g. a semifinal was a bye). */
  private thirdDormant(third: Match) {
    const semis = this.semisOf(third);
    return (
      third.winnerId === null &&
      !(third.playerA !== null && third.playerB !== null) &&
      semis.length > 0 &&
      semis.every((s) => s.winnerId !== null)
    );
  }

  private hasPlayers(m: Match) {
    return m.playerA !== null || m.playerB !== null;
  }
  branchResolved = (match: Match): boolean => {
    if (match.winnerId !== null) return true;
    if (this.hasPlayers(match)) return false;
    if (match.round === 0) return true;
    const [f0, f1] = this.feeders(match);
    return !!f0 && !!f1 && this.branchResolved(f0) && this.branchResolved(f1);
  };
  hasVisibleContent = (match: Match): boolean => {
    if (this.isThird(match)) {
      if (match.winnerId !== null) return true;
      return !this.thirdDormant(match) && this.semisOf(match).some((s) => s.playerA !== null && s.playerB !== null);
    }
    if (this.hasPlayers(match) || match.winnerId !== null) return true;
    if (match.round === 0) return false;
    const [f0, f1] = this.feeders(match);
    return [f0, f1].some((f) => !!f && (this.hasPlayers(f) || f.winnerId !== null));
  };
  isMatchReady = (match: Match): boolean => {
    if (match.winnerId !== null) return false;
    if (this.isThird(match)) return match.playerA !== null && match.playerB !== null;
    if (match.playerA !== null && match.playerB !== null) return true;
    const [f0, f1] = this.feeders(match);
    const list = [f0, f1].filter((f): f is Match => !!f);
    if (list.length === 0) return this.hasPlayers(match);
    return list.every(this.branchResolved);
  };

  /* ── swiss standings ── */
  swissStandings(): Standing[] {
    const map = new Map<string, Standing>();
    for (const player of this.players) {
      map.set(player.id, {
        player, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, history: [],
        matchPoints: 0, pointDifference: 0, buchholz: 0,
      });
    }
    const opponents = new Map<string, Set<string>>();
    const addOpp = (a: string, b: string) => {
      if (!opponents.has(a)) opponents.set(a, new Set());
      opponents.get(a)!.add(b);
    };
    for (const m of this.matches) {
      if (m.group === 0 && m.playerA !== null && m.playerB !== null) {
        addOpp(m.playerA, m.playerB);
        addOpp(m.playerB, m.playerA);
      }
    }
    for (const m of this.matches) {
      const winner = m.winnerId;
      if (winner === null) continue;
      const ws = map.get(winner);
      if (!ws) continue;
      const loser = m.playerA === winner ? m.playerB : m.playerA;
      const wScore = m.playerA === winner ? m.scoreA : m.scoreB;
      const lScore = m.playerA === winner ? m.scoreB : m.scoreA;
      ws.wins++;
      ws.pointsFor += wScore ?? 1;
      ws.pointsAgainst += lScore ?? 0;
      ws.history.push("W");
      const ls = loser !== null ? map.get(loser) : undefined;
      if (ls) {
        ls.losses++;
        ls.pointsFor += lScore ?? 0;
        ls.pointsAgainst += wScore ?? 1;
        ls.history.push("L");
      }
    }
    for (const s of map.values()) {
      s.matchPoints = s.wins * 3;
      s.pointDifference = s.pointsFor - s.pointsAgainst;
    }
    for (const s of map.values()) {
      let total = 0;
      for (const id of opponents.get(s.player.id) ?? []) total += map.get(id)?.matchPoints ?? 0;
      s.buchholz = total;
    }
    return [...map.values()].sort(
      (a, b) => b.matchPoints - a.matchPoints || b.buchholz - a.buchholz || b.pointDifference - a.pointDifference,
    );
  }

  /* ── setup actions ── */
  private resetBracketIfSetup() {
    if (this.status === "setup") this.matches = [];
  }
  private refreshSwissAdvance() {
    if (this.isSwiss && !this.swissAdvanceConfigured) {
      this.swissAdvanceCount = Math.max(2, Math.ceil(this.players.length / 2));
    }
  }

  setByeMode(mode: ByeMode) {
    if (!this.canClear) return;
    this.byeMode = mode;
    if (mode === "custom" && (this.customByeCount <= 0 || this.customByeCount >= this.players.length)) {
      this.customByeCount = Math.min(this.players.length - 1, this.automaticByeCount);
    }
    if (this.players.length >= 2) this.generateBracket();
    this.notify();
  }
  setCustomByeCount(count: number) {
    if (!this.canClear) return;
    this.customByeCount = clamp(count, 0, Math.max(0, this.players.length - 1));
    if (this.byeMode === "custom" && this.players.length >= 2) this.generateBracket();
    this.notify();
  }
  addPlayer(rawName: string) {
    const name = rawName.trim();
    if (!name || this.players.length >= MAX_PLAYERS) return;
    if (this.players.some((p) => p.name.toLowerCase() === name.toLowerCase())) return;
    this.players.push({ id: uid(), name, seed: this.players.length + 1 });
    this.refreshSwissAdvance();
    this.resetBracketIfSetup();
    this.notify();
  }
  addPlayers(names: string[]) {
    for (const n of names) {
      if (this.players.length >= MAX_PLAYERS) break;
      this.addPlayer(n);
    }
  }
  generateNumberedPlayers(count: number) {
    if (!this.canClear) return;
    const total = clamp(count, 2, MAX_PLAYERS);
    this.players = Array.from({ length: total }, (_, i) => ({ id: `numbered-${uid()}-${i}`, name: `Player ${i + 1}`, seed: i + 1 }));
    this.matches = [];
    this.history = [];
    this.refreshSwissAdvance();
    this.notify();
  }
  removePlayer(id: string) {
    if (this.status !== "setup") return;
    this.players = this.players.filter((p) => p.id !== id);
    this.resetBracketIfSetup();
    this.notify();
  }
  clearRoster() {
    if (!this.canClear) return;
    this.players = [];
    this.matches = [];
    this.archivedMatches = [];
    this.archivedPlayerNames = {};
    this.history = [];
    this.swissRound = 0;
    this.swissAdvanceCount = 0;
    this.swissAdvanceConfigured = false;
    this.swissStage = null;
    this.singleEliminationStage = null;
    this.notify();
  }
  setBracketCount(value: number) {
    this.bracketCount = clamp(value, 1, Math.max(1, this.players.length));
    if (this.status === "setup" && this.players.length >= 2) this.generateBracket();
    this.notify();
  }
  setCustomMatching(value: boolean) {
    if (this.status !== "setup") return;
    this.customMatching = value;
    this.notify();
  }
  setBracketType(type: BracketType) {
    if (this.status !== "setup") return;
    this.bracketType = type;
    if (type === "swiss") {
      this.swissAdvanceCount = Math.max(2, Math.ceil(this.players.length / 2));
      this.swissAdvanceConfigured = false;
    }
    if (this.players.length >= 2) this.generateBracket();
    this.notify();
  }
  setSwissRounds(value: number) {
    if (!this.canClear) return;
    this.swissRounds = clamp(value, 1, 10);
    if (this.isSwiss && this.players.length >= 2) this.generateBracket();
    this.notify();
  }
  setSwissAdvanceCount(value: number) {
    if (!this.canClear) return;
    this.swissAdvanceCount = clamp(value, 2, Math.max(2, this.players.length));
    this.swissAdvanceConfigured = true;
    this.notify();
  }
  setTournamentName(value: string) {
    this.tournamentNameRaw = value;
    this.notify();
  }
  randomizeSeeding() {
    if (this.status !== "setup") return;
    const shuffled = [...this.players];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    shuffled.forEach((p, i) => (p.seed = i + 1));
    if (this.players.length >= 2) this.generateBracket();
    this.notify();
  }

  /* ── bracket generation ── */
  generateBracket(source?: Player[]) {
    const roster0 = source ?? this.players;
    if (this.status !== "setup" || roster0.length < 2) return;
    if (this.isSwiss && !source) {
      this.matches = [];
      this.swissRound = 1;
      this.generateSwissRound();
      return;
    }

    this.archivedMatches.push(...this.matches);
    this.matches = [];
    const roster = [...roster0].sort((a, b) => a.seed - b.seed);
    const groupTotal = Math.min(this.bracketCount, roster.length);
    const groupSize = Math.ceil(roster.length / groupTotal);
    let cursor = 0;

    for (let group = 0; group < groupTotal; group++) {
      const gp = roster.slice(cursor, Math.min(cursor + groupSize, roster.length));
      cursor += gp.length;
      if (gp.length === 0) continue;

      let effectiveByeCount = 0;
      if (this.byeMode === "automatic") effectiveByeCount = nextPow2(gp.length) - gp.length;
      else if (this.byeMode === "custom") effectiveByeCount = clamp(this.customByeCount, 0, gp.length - 1);

      const slotCount = nextPow2(gp.length + (this.byeMode === "none" ? 0 : effectiveByeCount));
      const roundCount = Math.max(1, Math.round(Math.log2(slotCount)));

      for (let round = 0; round < roundCount; round++) {
        const matchCount = Math.floor(slotCount / 2 ** round / 2);
        for (let slot = 0; slot < matchCount; slot++) {
          this.matches.push(newMatch(`g${group}-r${round}-m${slot}`, group, round, slot));
        }
      }

      // 3rd place match: same round as the final, fed by the semifinal losers.
      if (roundCount >= 2) {
        this.matches.push(newMatch(`g${group}-third`, group, roundCount - 1, 1));
      }

      const at = (round: number, slot: number) =>
        this.matches.find((m) => m.group === group && m.round === round && m.slot === slot);

      if (effectiveByeCount > 0 && this.byeMode !== "none") {
        const byes = gp.slice(0, Math.min(effectiveByeCount, gp.length));
        const unseeded = gp.slice(Math.min(effectiveByeCount, gp.length));

        const pairs: [Player, Player][] = [];
        let idx = 0;
        while (idx + 1 < unseeded.length) {
          pairs.push([unseeded[idx], unseeded[idx + 1]]);
          idx += 2;
        }
        if (idx < unseeded.length) byes.push(unseeded[idx]);

        const pairedCount = Math.min(byes.length, pairs.length);
        let r1Slot = 0;
        for (let i = 0; i < pairedCount; i++) {
          const target = at(1, r1Slot);
          if (target) target.playerA = byes[i].id;
          const feeder = at(0, r1Slot * 2 + 1);
          if (feeder) {
            feeder.playerA = pairs[i][0].id;
            feeder.playerB = pairs[i][1].id;
          }
          r1Slot++;
        }
        for (let i = pairedCount; i < byes.length; i += 2) {
          const target = at(1, r1Slot);
          if (target) {
            target.playerA = byes[i].id;
            if (i + 1 < byes.length) target.playerB = byes[i + 1].id;
          }
          r1Slot++;
        }
        for (let i = pairedCount; i < pairs.length; i += 2) {
          const fa = at(0, r1Slot * 2);
          if (fa) {
            fa.playerA = pairs[i][0].id;
            fa.playerB = pairs[i][1].id;
          }
          if (i + 1 < pairs.length) {
            const fb = at(0, r1Slot * 2 + 1);
            if (fb) {
              fb.playerA = pairs[i + 1][0].id;
              fb.playerB = pairs[i + 1][1].id;
            }
          }
          r1Slot++;
        }
      } else {
        const slots: (string | null)[] = new Array(slotCount).fill(null);
        let pc = 0;
        let mc = 0;
        if (gp.length % 2 === 1) {
          slots[0] = gp[pc++].id;
          mc++;
        }
        while (pc < gp.length) {
          slots[mc * 2] = gp[pc++].id;
          slots[mc * 2 + 1] = gp[pc++].id;
          mc++;
        }
        for (const m of this.matches) {
          if (m.group === group && m.round === 0) {
            m.playerA = slots[m.slot * 2] ?? null;
            m.playerB = slots[m.slot * 2 + 1] ?? null;
          }
        }
      }
    }
    this.resolveByes();
    this.history.push(`Generated ${this.players.length} players across ${groupTotal} bracket${groupTotal === 1 ? "" : "s"}.`);
    this.notify();
  }

  private hasPlayed(a: string, b: string) {
    return this.matches.some((m) => (m.playerA === a && m.playerB === b) || (m.playerA === b && m.playerB === a));
  }

  generateSwissRound() {
    if (!this.isSwiss || this.players.length < 2) return;
    const ordered =
      this.swissRound === 1
        ? [...this.players].sort((a, b) => a.seed - b.seed)
        : this.swissStandings().map((s) => s.player);
    const used = new Set<string>();
    for (let index = 0; index < ordered.length; index++) {
      if (used.has(ordered[index].id)) continue;
      const first = ordered[index];
      let oi = index + 1;
      while (oi < ordered.length && (used.has(ordered[oi].id) || this.hasPlayed(first.id, ordered[oi].id))) oi++;
      if (oi >= ordered.length) {
        oi = index + 1;
        while (oi < ordered.length && used.has(ordered[oi].id)) oi++;
      }
      if (oi >= ordered.length) break;
      const opp = ordered[oi];
      used.add(first.id);
      used.add(opp.id);
      this.matches.push(
        newMatch(`swiss-r${this.swissRound}-m${this.matches.length}`, 0, this.swissRound, this.matches.length, first.id, opp.id),
      );
    }
    const bye = ordered.find((p) => !used.has(p.id));
    if (bye) {
      const m = newMatch(`swiss-r${this.swissRound}-bye`, 0, this.swissRound, this.matches.length, bye.id);
      m.winnerId = bye.id;
      m.scoreA = 1;
      m.scoreB = 0;
      this.matches.push(m);
    }
    this.history.push(`Generated Swiss round ${this.swissRound} of ${this.swissRounds}.`);
    this.notify();
  }

  /* ── lifecycle ── */
  start() {
    if (this.players.length < 2 || this.matches.length === 0 || this.status === "running") return;
    this.status = "running";
    this.startTimer();
    this.notify();
  }
  pause() {
    if (this.status !== "running") return;
    this.status = "paused";
    this.notify();
  }
  stop() {
    if (this.status !== "running" && this.status !== "paused") return;
    this.stopTimer();
    this.status = "stopped";
    this.syncActiveStageSnapshot();
    this.notify();
  }
  finish() {
    this.stopTimer();
    this.status = "completed";
    this.notify();
  }
  startNewTournament() {
    this.stopTimer();
    this.players = [];
    this.matches = [];
    this.archivedMatches = [];
    this.archivedPlayerNames = {};
    this.history = [];
    this.swissStage = null;
    this.singleEliminationStage = null;
    this.customMatching = false;
    this.bracketType = null;
    this.bracketCount = 1;
    this.swissRound = 0;
    this.swissAdvanceCount = 0;
    this.swissAdvanceConfigured = false;
    this.seconds = 0;
    this.status = "setup";
    this.byeMode = "automatic";
    this.customByeCount = 0;
    this.notify();
  }

  /* ── play ── */
  private matchContaining(playerId: string) {
    return this.matches.find((m) => m.round === 0 && (m.playerA === playerId || m.playerB === playerId));
  }
  private setSlot(match: Match, slot: number, value: string | null) {
    if (slot === 0) match.playerA = value;
    else match.playerB = value;
  }
  private name(id: string) {
    return this.playerById(id)?.name ?? "Unknown player";
  }

  placePlayer(playerId: string, matchId: string, slot: number) {
    if (this.status !== "setup" || !this.customMatching) return;
    const target = this.matches.find((m) => m.id === matchId);
    if (!target || target.round !== 0) return;
    const current = this.matchContaining(playerId);
    if (!current) return;
    const oldSlot = current.playerA === playerId ? 0 : 1;
    const targetPlayer = slot === 0 ? target.playerA : target.playerB;
    this.setSlot(current, oldSlot, targetPlayer);
    this.setSlot(target, slot, playerId);
    this.notify();
  }

  chooseWinner(matchId: string, playerId: string) {
    if (this.status !== "running" && this.status !== "paused") return;
    const match = this.matches.find((m) => m.id === matchId);
    if (!match) return;
    if (match.playerA !== playerId && match.playerB !== playerId) return;
    if (match.winnerId !== null) return;
    match.winnerId = playerId;
    const loser = match.playerA === playerId ? match.playerB : match.playerA;
    this.history.push(`${this.name(playerId)} won ${match.id}${loser === null ? " by bye" : ` over ${this.name(loser)}`}.`);
    const next = this.nextMatch(match);
    if (next) this.setSlot(next, match.slot % 2 === 0 ? 0 : 1, playerId);
    const third = this.thirdPlaceMatch(match.group);
    if (third && loser !== null && match.round === third.round - 1) {
      this.setSlot(third, match.slot % 2 === 0 ? 0 : 1, loser);
    }
    this.resolveByes();
    this.syncActiveStageSnapshot();
    this.notify();
  }

  recordSwissScores(matchId: string, scoreA: number, scoreB: number) {
    if (!this.isSwiss || (this.status !== "running" && this.status !== "paused")) return;
    const match = this.matches.find((m) => m.id === matchId);
    if (!match || match.winnerId !== null || match.playerA === null || match.playerB === null) return;
    match.scoreA = scoreA;
    match.scoreB = scoreB;
    match.winnerId = scoreB > scoreA ? match.playerB : match.playerA; // a tie goes to player A, as before
    this.history.push(`${this.name(match.winnerId)} won Swiss round ${match.round} (${scoreA} - ${scoreB}).`);

    const current = this.matches.filter((m) => m.group === 0 && m.round === this.swissRound);
    if (current.length > 0 && current.every((m) => m.winnerId !== null)) {
      if (this.swissRound < this.swissRounds) {
        this.swissRound++;
        this.generateSwissRound();
      } else {
        this.status = "stopped";
      }
    }
    this.syncActiveStageSnapshot();
    this.notify();
  }

  dropWinner(playerId: string, targetMatchId: string) {
    if (this.status !== "running" && this.status !== "paused") return;
    const target = this.matches.find((m) => m.id === targetMatchId);
    const source = this.matchContaining(playerId);
    if (!target || !source || source.round >= target.round || source.winnerId !== null) return;
    this.chooseWinner(source.id, playerId);
  }

  startSingleEliminationFromSwiss() {
    if (!this.swissComplete) return;
    this.swissStage = this.captureStage();
    const count = clamp(this.swissAdvanceCount, 2, this.players.length);
    const winners = this.swissStandings().slice(0, count).map((s) => s.player);
    for (const p of this.players) this.archivedPlayerNames[p.id] = p.name;
    this.archivedMatches.push(...this.matches);
    this.players = winners;
    this.players.forEach((p, i) => (p.seed = i + 1));
    this.matches = [];
    this.history = [`Started single elimination with ${count} Swiss qualifiers.`];
    this.bracketType = "singleElimination";
    this.bracketCount = 1;
    this.swissRound = 0;
    this.status = "setup";
    this.generateBracket(this.players);
    this.start();
    this.singleEliminationStage = this.captureStage();
    this.notify();
  }

  switchStage(type: BracketType) {
    if (!this.hasStageTabs || type === this.bracketType) return;
    if (type === "swiss") {
      this.singleEliminationStage = this.captureStage();
      this.restoreStage(this.swissStage!);
    } else {
      this.swissStage = this.captureStage();
      this.restoreStage(this.singleEliminationStage!);
    }
    this.notify();
  }

  private captureStage(): Snapshot {
    return {
      type: this.bracketType,
      players: this.players.map(copyPlayer),
      matches: this.matches.map(copyMatch),
      history: [...this.history],
      round: this.swissRound,
      rounds: this.swissRounds,
      bracketCount: this.bracketCount,
      status: this.status,
      byeMode: this.byeMode,
      customByeCount: this.customByeCount,
    };
  }
  private restoreStage(s: Snapshot) {
    this.bracketType = s.type;
    this.players = s.players.map(copyPlayer);
    this.matches = s.matches.map(copyMatch);
    this.history = [...s.history];
    this.swissRound = s.round;
    this.swissRounds = s.rounds;
    this.bracketCount = s.bracketCount;
    this.status = s.status;
    this.byeMode = s.byeMode;
    this.customByeCount = s.customByeCount;
  }
  private syncActiveStageSnapshot() {
    if (!this.hasStageTabs) return;
    if (this.isSwiss) this.swissStage = this.captureStage();
    else this.singleEliminationStage = this.captureStage();
  }

  get finalWinners(): Player[] {
    const result: Player[] = [];
    for (const group of this.groups) {
      const gm = this.matches.filter((m) => m.group === group && !this.isThird(m));
      if (gm.length === 0) continue;
      const final = gm.reduce((a, b) => (a.round > b.round ? a : b));
      const winner = this.playerById(final.winnerId);
      if (winner) result.push(winner);
    }
    return result;
  }

  reseedWinners() {
    const winners = this.finalWinners;
    if (winners.length < 2) return;
    this.players = winners;
    this.status = "setup";
    this.customMatching = false;
    this.bracketCount = 1; // the winners now meet in a single bracket
    this.seconds = 0;
    this.generateBracket(winners);
  }

  /* ── bye resolution ── */
  private resolveByes() {
    let changed = true;
    while (changed) {
      changed = false;
      for (const match of this.matches) {
        if (match.winnerId !== null) continue;
        if (this.isThird(match)) continue;
        const [f0, f1] = this.feeders(match);

        if (match.round > 0 && f0 && f1) {
          if (f0.winnerId !== null && match.playerA === null) {
            match.playerA = f0.winnerId;
            changed = true;
          }
          if (f1.winnerId !== null && match.playerB === null) {
            match.playerB = f1.winnerId;
            changed = true;
          }
        }

        if (!this.hasPlayers(match)) continue;
        if (match.playerA !== null && match.playerB !== null) continue;
        if (match.round > 0 && f0 && f1 && (!this.branchResolved(f0) || !this.branchResolved(f1))) continue;

        match.winnerId = match.playerA ?? match.playerB;
        const next = this.nextMatch(match);
        if (next && match.winnerId !== null) this.setSlot(next, match.slot % 2 === 0 ? 0 : 1, match.winnerId);
        changed = true;
      }
    }
  }

  /* ── import / export ── */
  importText(text: string, extension: string) {
    if (text.startsWith("type,tournament_name,format")) {
      this.restoreCsv(text);
      return;
    }
    this.addPlayers(this.parseRoster(text, extension));
  }

  private parseRoster(text: string, extension: string): string[] {
    const trimmed = text.trimStart();
    if (extension.toLowerCase() === "json" || trimmed.startsWith("[") || trimmed.startsWith("{")) {
      try {
        const decoded = JSON.parse(text);
        const values = Array.isArray(decoded) ? decoded : decoded.players;
        if (!Array.isArray(values)) return [];
        return values
          .map((v: unknown) => (v && typeof v === "object" ? String((v as { name?: unknown }).name ?? "") : String(v)))
          .filter((n: string) => n.trim().length > 0);
      } catch {
        return [];
      }
    }
    return text
      .split(/\r?\n/)
      .flatMap((line) => line.split(","))
      .map((n) => n.trim())
      .filter((n) => n.length > 0 && n.toLowerCase() !== "name");
  }

  private stagesForExport(): Snapshot[] {
    const current = this.captureStage();
    if (this.isSwiss) return [current, ...(this.singleEliminationStage ? [this.singleEliminationStage] : [])];
    return [...(this.swissStage ? [this.swissStage] : []), current];
  }

  csvContent(): string {
    const esc = (v: string) => {
      const e = v.replace(/"/g, '""');
      return /[,"\n]/.test(e) ? `"${e}"` : e;
    };
    const rows: string[][] = [
      ["type", "tournament_name", "format", "round", "match_id", "player_a", "player_b", "winner", "score_a", "score_b", "seed", "stage"],
    ];
    for (const stage of this.stagesForExport()) {
      const stageName = stage.type ?? "";
      const names: Record<string, string> = {};
      for (const p of stage.players) names[p.id] = p.name;
      const n = (id: string | null) => (id !== null ? names[id] ?? "" : "");
      for (const p of stage.players) {
        rows.push(["player", this.tournamentName, stageName, "", "", p.name, "", "", "", "", `${p.seed}`, stageName]);
      }
      for (const m of stage.matches) {
        rows.push([
          "match", this.tournamentName, stageName, `${m.round}`, m.id, n(m.playerA), n(m.playerB), n(m.winnerId),
          m.scoreA === null ? "" : `${m.scoreA}`, m.scoreB === null ? "" : `${m.scoreB}`, "", stageName,
        ]);
      }
      for (const entry of stage.history) {
        rows.push(["history", this.tournamentName, stageName, "", "", entry, "", "", "", "", "", stageName]);
      }
    }
    return rows.map((r) => r.map(esc).join(",")).join("\n");
  }

  exportCsv() {
    const d = new Date();
    const pad = (v: number, n = 2) => String(v).padStart(n, "0");
    const stamp = `${pad(d.getFullYear(), 4)}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
    const safe = this.tournamentName.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/_+/g, "_");
    const url = URL.createObjectURL(new Blob([this.csvContent()], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${safe}-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  private parseCsvRow(line: string): string[] {
    const values: string[] = [];
    let buf = "";
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (quoted && line[i + 1] === '"') {
          buf += '"';
          i++;
        } else quoted = !quoted;
      } else if (ch === "," && !quoted) {
        values.push(buf);
        buf = "";
      } else buf += ch;
    }
    values.push(buf);
    return values;
  }

  private restoreCsv(text: string) {
    const rows = text.split(/\r?\n/).slice(1).map((l) => this.parseCsvRow(l));
    this.players = [];
    this.matches = [];
    this.archivedMatches = [];
    this.archivedPlayerNames = {};
    this.swissStage = null;
    this.singleEliminationStage = null;

    const stageOf = (row: string[]): BracketType => {
      const stage = row.length > 11 && row[11] ? row[11] : row[2];
      return stage === "swiss" ? "swiss" : "singleElimination";
    };
    const stagePlayers: Record<string, Player[]> = {};
    const stageIds: Record<string, Record<string, string>> = {};
    const stageMatches: Record<string, Match[]> = {};
    const stageHistory: Record<string, string[]> = {};
    const stageIndexes: Record<string, number> = {};

    for (const row of rows) {
      if (row.length < 11) continue;
      this.tournamentNameRaw = row[1] === "" ? "Tournament" : row[1];
      const key = stageOf(row);
      stagePlayers[key] ??= [];
      stageIds[key] ??= {};
      stageHistory[key] ??= [];
      if (row[0] === "history" && row[5]) stageHistory[key].push(row[5]);
      if (row[0] === "player" && row[5]) {
        const index = key in stageIndexes ? ++stageIndexes[key] : (stageIndexes[key] = 0);
        const id = `${key}-imported-${index}`;
        stageIds[key][row[5]] = id;
        stagePlayers[key].push({ id, name: row[5], seed: parseInt(row[10], 10) || index + 1 });
      }
    }
    for (const row of rows) {
      if (row.length < 11 || row[0] !== "match") continue;
      const key = stageOf(row);
      const ids = stageIds[key] ?? {};
      const list = (stageMatches[key] ??= []);
      const m = newMatch(row[4], 0, parseInt(row[3], 10) || 0, list.length, ids[row[5]] ?? null, ids[row[6]] ?? null);
      m.winnerId = ids[row[7]] ?? null;
      const sa = parseInt(row[8], 10);
      const sb = parseInt(row[9], 10);
      m.scoreA = Number.isNaN(sa) ? null : sa;
      m.scoreB = Number.isNaN(sb) ? null : sb;
      list.push(m);
    }
    for (const type of ["swiss", "singleElimination"] as BracketType[]) {
      const matches = stageMatches[type] ?? [];
      const maxRound = matches.reduce((acc, m) => Math.max(acc, m.round), 0);
      const stage: Snapshot = {
        type,
        players: stagePlayers[type] ?? [],
        matches,
        history: stageHistory[type] ?? [],
        round: type === "swiss" ? Math.max(1, maxRound) : 0,
        rounds: type === "swiss" ? Math.max(1, maxRound) : 1,
        bracketCount: 1,
        status: "stopped",
        byeMode: "automatic",
        customByeCount: 0,
      };
      if (stage.players.length === 0) continue;
      if (type === "swiss") this.swissStage = stage;
      else this.singleEliminationStage = stage;
    }
    if (this.singleEliminationStage) this.restoreStage(this.singleEliminationStage);
    else if (this.swissStage) this.restoreStage(this.swissStage);
    this.swissAdvanceCount = Math.max(2, Math.ceil(this.players.length / 2));
    this.notify();
  }
}

/* ═════════════════════════════════════════════════════════════════════════════
   UI PRIMITIVES (built on the theme folder)
   ═════════════════════════════════════════════════════════════════════════════ */

type Palette = (typeof AppPalette)["light" | "dark"];
const UiCtx = createContext<{ p: Palette; isDark: boolean }>({ p: AppPalette.light, isDark: false });
const useUi = () => useContext(UiCtx);

type BtnTone = "default" | "primary" | "danger";

function Btn({
  label, onPressed, tone = "default", disabled = false,
}: { label: string; onPressed?: () => void; tone?: BtnTone; disabled?: boolean }) {
  const { p, isDark } = useUi();
  const color = tone === "primary" ? AppColors.lime : tone === "danger" ? AppColors.coral : p.chip;
  const labelColor = tone === "default" ? undefined : AppColors.ink;
  return (
    <NeoButton
      label={label}
      fontSize={13}
      isDark={isDark}
      color={color}
      labelColor={labelColor}
      onPressed={disabled ? undefined : onPressed}
    />
  );
}

function Eyebrow({ text }: { text: string }) {
  const { p } = useUi();
  return (
    <div style={{ color: p.ink, opacity: 0.7, fontSize: 12, fontWeight: 800, letterSpacing: 2, textTransform: "uppercase" }}>
      {text}
    </div>
  );
}

function Field({
  label, value, onChange, placeholder, disabled, type = "text", onEnter, width,
}: {
  label?: string; value: string; onChange: (v: string) => void; placeholder?: string;
  disabled?: boolean; type?: string; onEnter?: () => void; width?: number | string;
}) {
  const { p } = useUi();
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, width, flex: width ? "none" : 1, minWidth: 0 }}>
      {label && <span style={{ color: p.ink, fontWeight: 700, fontSize: 13 }}>{label}</span>}
      <input
        type={type}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
        style={{
          width: "100%", boxSizing: "border-box", border: `2px solid ${disabled ? p.ink + "55" : AppColors.ink}`,
          borderRadius: 8, padding: "8px 10px", backgroundColor: p.card, color: p.ink,
          fontSize: 15, fontFamily: "inherit", opacity: disabled ? 0.6 : 1,
        }}
      />
    </label>
  );
}

function Select<T extends string | number>({
  value, options, onChange, disabled, placeholder,
}: {
  value: T | ""; options: { value: T; label: string }[]; onChange: (v: T) => void;
  disabled?: boolean; placeholder?: string;
}) {
  const { p } = useUi();
  const numeric = options.length > 0 && typeof options[0].value === "number";
  const handle = (e: ChangeEvent<HTMLSelectElement>) =>
    onChange((numeric ? Number(e.target.value) : e.target.value) as T);
  return (
    <select
      value={value}
      disabled={disabled}
      onChange={handle}
      style={{
        height: 40, border: `2px solid ${disabled ? p.ink + "55" : AppColors.ink}`, borderRadius: 8,
        backgroundColor: p.card, color: p.ink, fontWeight: 800, fontSize: 13, padding: "0 10px",
        fontFamily: "inherit", cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.6 : 1,
      }}
    >
      {placeholder && value === "" && <option value="" disabled>{placeholder}</option>}
      {options.map((o) => (
        <option key={String(o.value)} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

const STATUS_VIEW: Record<Status, { label: string; bg: string; fg: string }> = {
  setup: { label: "SETUP", bg: AppColors.oatmilk, fg: AppColors.ink },
  running: { label: "LIVE", bg: AppColors.lime, fg: AppColors.ink },
  paused: { label: "PAUSED", bg: AppColors.coral, fg: AppColors.ink },
  stopped: { label: "FINISHED", bg: AppColors.ink, fg: AppColors.white },
  completed: { label: "COMPLETE", bg: AppColors.lime, fg: AppColors.ink },
};

function StatusBadge({ status }: { status: Status }) {
  const v = STATUS_VIEW[status];
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, border: `2px solid ${AppColors.ink}`, borderRadius: 8,
        backgroundColor: v.bg, color: v.fg, padding: "2px 10px", fontSize: 12, fontWeight: 900, letterSpacing: 1.5,
      }}
    >
      {status === "running" && (
        <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: AppColors.coral, display: "inline-block" }} />
      )}
      {v.label}
    </span>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   BRACKET PIECES
   ═════════════════════════════════════════════════════════════════════════════ */

const SLOT_HEIGHT = 30;
const MATCH_HEIGHT = 66; // 2 slots + 2px divider + 4px border
const MATCH_UNIT = 76; // card height + vertical gap
const THIRD_PLACE_GAP_UNITS = 2; // 3rd place card sits this many match-units below the final

function PlayerSlot({
  ctrl, match, slot, onSwissResult,
}: { ctrl: TournamentController; match: Match; slot: 0 | 1; onSwissResult: (m: Match) => void }) {
  const { p } = useUi();
  const id = slot === 0 ? match.playerA : match.playerB;
  const player = ctrl.playerById(id);
  const isWinner = id !== null && match.winnerId === id;
  const isLoser = match.winnerId !== null && id !== null && !isWinner;
  const score = slot === 0 ? match.scoreA : match.scoreB;
  const ready = ctrl.isMatchReady(match);
  const clickable = !ctrl.canClear && ready;

  const nameColor = !player
    ? p.ink + "66"
    : isWinner
      ? AppColors.ink
      : isLoser
        ? p.ink + "88"
        : p.ink;

  const acceptsSwap = () => ctrl.customMatching && ctrl.canClear && match.round === 0;

  const onClick = () => {
    if (!clickable) return;
    if (ctrl.isSwiss) onSwissResult(match);
    else if (player) ctrl.chooseWinner(match.id, player.id);
  };

  return (
    <div
      draggable={!!player}
      onDragStart={(e: DragEvent) => {
        if (!player) return;
        e.dataTransfer.setData("text/plain", player.id);
        e.dataTransfer.effectAllowed = "move";
      }}
      onDragOver={(e: DragEvent) => {
        if (acceptsSwap()) e.preventDefault();
      }}
      onDrop={(e: DragEvent) => {
        if (!acceptsSwap()) return; // otherwise bubble to the match card (advance a winner)
        e.preventDefault();
        e.stopPropagation();
        const dragged = e.dataTransfer.getData("text/plain");
        if (dragged) ctrl.placePlayer(dragged, match.id, slot);
      }}
      onClick={onClick}
      title={clickable ? (ctrl.isSwiss ? "Record result" : "Advance this player") : undefined}
      style={{
        height: SLOT_HEIGHT, display: "flex", alignItems: "stretch", boxSizing: "border-box",
        backgroundColor: isWinner ? AppColors.lime : p.card, cursor: clickable ? "pointer" : player ? "grab" : "default",
      }}
    >
      <div
        style={{
          width: 26, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
          backgroundColor: p.subcard, borderRight: `2px solid ${AppColors.ink}`, color: p.ink, fontSize: 11, fontWeight: 800,
        }}
      >
        {player ? player.seed : ""}
      </div>
      <div
        style={{
          flex: 1, minWidth: 0, display: "flex", alignItems: "center", padding: "0 8px", fontSize: 13,
          fontWeight: player ? 800 : 500, color: nameColor, textDecoration: isLoser ? "line-through" : "none",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{player?.name ?? "Open slot"}</span>
      </div>
      {isWinner && (
        <div style={{ display: "flex", alignItems: "center", paddingRight: 4, color: AppColors.ink, fontWeight: 900, fontSize: 13 }}>✓</div>
      )}
      <div
        style={{
          width: 28, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 900,
          backgroundColor: isWinner ? AppColors.ink : p.subcard, color: isWinner ? AppColors.lime : p.ink,
        }}
      >
        {score ?? 0}
      </div>
    </div>
  );
}

function MatchCard({
  ctrl, match, onSwissResult,
}: { ctrl: TournamentController; match: Match; onSwissResult: (m: Match) => void }) {
  const { p } = useUi();
  const [over, setOver] = useState(false);
  const accepts = !ctrl.canClear;

  return (
    <div
      onDragOver={(e: DragEvent) => {
        if (!accepts) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={(e: DragEvent) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setOver(false);
      }}
      onDrop={(e: DragEvent) => {
        setOver(false);
        if (!accepts) return;
        e.preventDefault();
        const dragged = e.dataTransfer.getData("text/plain");
        if (dragged) ctrl.dropWinner(dragged, match.id);
      }}
      style={{
        border: `${over ? 3 : 2}px solid ${over ? AppColors.coral : AppColors.ink}`, borderRadius: 8,
        backgroundColor: p.card, boxShadow: `3px 3px 0 ${p.shadow}`, overflow: "hidden", boxSizing: "border-box",
      }}
    >
      <PlayerSlot ctrl={ctrl} match={match} slot={0} onSwissResult={onSwissResult} />
      <div style={{ height: 2, backgroundColor: AppColors.ink }} />
      <PlayerSlot ctrl={ctrl} match={match} slot={1} onSwissResult={onSwissResult} />
      {match.notes && (
        <div style={{ backgroundColor: p.subcard, color: p.ink, opacity: 0.8, fontSize: 10, fontStyle: "italic", padding: "3px 8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {match.notes}
        </div>
      )}
    </div>
  );
}

const roundLabel = (count: number) =>
  count === 1 ? "Final" : count === 2 ? "Semifinals" : count === 4 ? "Quarterfinals" : `Round of ${count * 2}`;

function RoundColumn({
  ctrl, round, roundIndex, allRounds, onSwissResult, third,
}: {
  ctrl: TournamentController; round: Match[]; roundIndex: number; allRounds: Match[][];
  onSwissResult: (m: Match) => void; third?: Match;
}) {
  const visible = round.filter(ctrl.hasVisibleContent);
  const thisComplete = visible.length > 0 && visible.every((m) => m.winnerId !== null);

  let finishedPreceding = 0;
  for (let r = 0; r < roundIndex; r++) {
    const prev = allRounds[r].filter(ctrl.hasVisibleContent);
    if (prev.length > 0 && prev.every((m) => m.winnerId !== null)) finishedPreceding++;
    else break;
  }

  let topMargin: number;
  let spacing: number;
  if (thisComplete || finishedPreceding === roundIndex) {
    topMargin = 0;
    spacing = MATCH_UNIT - MATCH_HEIGHT;
  } else {
    const eff = roundIndex - finishedPreceding;
    topMargin = 2 ** (eff - 1) * MATCH_UNIT - MATCH_UNIT / 2;
    spacing = 2 ** eff * MATCH_UNIT - MATCH_HEIGHT;
  }

  return (
    <div style={{ width: 200, flexShrink: 0 }}>
      <Eyebrow text={roundLabel(round.length)} />
      <div style={{ height: 10 }} />
      <div style={{ paddingTop: topMargin }}>
        {visible.map((m, idx) => (
          <div key={m.id} style={{ marginBottom: idx === visible.length - 1 ? 0 : spacing }}>
            <MatchCard ctrl={ctrl} match={m} onSwissResult={onSwissResult} />
          </div>
        ))}
        {third && ctrl.hasVisibleContent(third) && (
          <div style={{ marginTop: THIRD_PLACE_GAP_UNITS * MATCH_UNIT - MATCH_HEIGHT }}>
            <Eyebrow text="3rd place" />
            <div style={{ height: 10 }} />
            <MatchCard ctrl={ctrl} match={third} onSwissResult={onSwissResult} />
          </div>
        )}
      </div>
    </div>
  );
}

function BracketInfo({ ctrl }: { ctrl: TournamentController }) {
  return (
    <div
      style={{
        display: "flex", alignItems: "center", gap: 8, padding: "8px 12px", border: `2px solid ${AppColors.ink}`,
        borderRadius: 8, backgroundColor: AppColors.lime, color: AppColors.ink, fontSize: 13, fontWeight: 700,
      }}
    >
      <span aria-hidden>ⓘ</span>
      <span>
        {ctrl.customMatching && ctrl.canClear
          ? "Drag players to swap positions in the first round only"
          : "Click a player to advance them, or drag winners to later matches"}
      </span>
    </div>
  );
}

function BracketGroup({
  ctrl, group, onSwissResult,
}: { ctrl: TournamentController; group: number; onSwissResult: (m: Match) => void }) {
  const { p } = useUi();
  const rounds = ctrl.matchesForGroup(group);
  const third = ctrl.thirdPlaceMatch(group);
  return (
    <div
      style={{
        border: `2px solid ${AppColors.ink}`, borderRadius: 8, backgroundColor: p.subcard, boxShadow: `3px 3px 0 ${p.shadow}`,
        marginBottom: AppSpacing.md, overflow: "hidden",
      }}
    >
      <div style={{ backgroundColor: AppColors.ink, color: AppColors.lime, padding: "10px 14px", fontSize: 12, fontWeight: 900, letterSpacing: 2 }}>
        BRACKET {group + 1}
        {ctrl.bracketCount > 1 ? ` OF ${ctrl.bracketCount}` : ""}
      </div>
      <div style={{ overflowX: "auto", padding: "14px 22px 20px 14px" }}>
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          {rounds.map((round, index) => (
            <div key={index} style={{ marginRight: index === rounds.length - 1 ? 0 : 36 }}>
              <RoundColumn
                ctrl={ctrl} round={round} roundIndex={index} allRounds={rounds} onSwissResult={onSwissResult}
                third={index === rounds.length - 1 ? third : undefined}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SwissRounds({
  ctrl, onSwissResult, onStandings,
}: { ctrl: TournamentController; onSwissResult: (m: Match) => void; onStandings: () => void }) {
  const { p } = useUi();
  const byRound = new Map<number, Match[]>();
  for (const m of ctrl.matches) {
    if (!byRound.has(m.round)) byRound.set(m.round, []);
    byRound.get(m.round)!.push(m);
  }
  const ordered = [...byRound.keys()].sort((a, b) => a - b);
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: AppSpacing.sm, marginBottom: AppSpacing.sm, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <BracketInfo ctrl={ctrl} />
        </div>
        <Btn label="Standings" onPressed={onStandings} />
      </div>
      <div style={{ display: "flex", alignItems: "flex-start", overflowX: "auto", padding: "0 6px 12px 0" }}>
        {ordered.map((round) => (
          <div
            key={round}
            style={{
              width: 214, flexShrink: 0, marginRight: AppSpacing.sm, padding: AppSpacing.sm, boxSizing: "border-box",
              border: `2px solid ${AppColors.ink}`, borderRadius: 8, backgroundColor: p.subcard, boxShadow: `3px 3px 0 ${p.shadow}`,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: AppSpacing.sm }}>
              <Eyebrow text={`Round ${round}`} />
              {round === ctrl.swissRound && (
                <span style={{ backgroundColor: AppColors.lime, color: AppColors.ink, border: `2px solid ${AppColors.ink}`, borderRadius: 6, padding: "0 6px", fontSize: 10, fontWeight: 900, letterSpacing: 1 }}>
                  LIVE
                </span>
              )}
            </div>
            {[...byRound.get(round)!].sort((a, b) => a.slot - b.slot).map((m) => (
              <div key={m.id} style={{ marginBottom: 12 }}>
                <MatchCard ctrl={ctrl} match={m} onSwissResult={onSwissResult} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ═════════════════════════════════════════════════════════════════════════════
   DIALOGS (all built on NeoDialog)
   ═════════════════════════════════════════════════════════════════════════════ */

const DialogTitle = ({ text }: { text: string }) => {
  const { p } = useUi();
  return <h2 style={{ margin: "0 0 12px", color: p.ink, fontSize: 22, fontWeight: 900, lineHeight: 1.1 }}>{text}</h2>;
};

function StandingsDialog({
  ctrl, showProceed, onClose, onProceed,
}: { ctrl: TournamentController; showProceed: boolean; onClose: () => void; onProceed: () => void }) {
  const { p, isDark } = useUi();
  const standings = ctrl.swissStandings();
  const th: CSSProperties = {
    position: "sticky", top: 0, backgroundColor: AppColors.ink, color: AppColors.white, textAlign: "left",
    padding: "8px 10px", fontSize: 12, fontWeight: 800, whiteSpace: "nowrap",
  };
  const td: CSSProperties = { padding: "7px 10px", whiteSpace: "nowrap" };

  return (
    <NeoDialog isDark={isDark} frost={0.6} maxWidth={900} ariaLabel="Swiss standings" closeLabel={showProceed ? "Review later" : "Close"} onClose={onClose}>
      <DialogTitle text={`${ctrl.tournamentName} standings`} />
      {showProceed && (
        <p style={{ margin: "0 0 12px", color: p.ink, opacity: 0.75, fontSize: 14 }}>
          Top {ctrl.swissAdvanceCount} players are marked to advance.
        </p>
      )}
      <div style={{ overflow: "auto", maxHeight: "50vh", border: `2px solid ${AppColors.ink}`, borderRadius: 8 }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
          <thead>
            <tr>
              {["#", "Advance", "Player", "W-L", "Points", "Diff", "Score", "Buchholz", "History"].map((h) => (
                <th key={h} style={th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {standings.map((s, index) => {
              const advancing = index < ctrl.swissAdvanceCount;
              return (
                <tr
                  key={s.player.id}
                  style={{
                    backgroundColor: advancing ? AppColors.lime + "80" : p.card,
                    color: advancing ? AppColors.ink : p.ink,
                    borderTop: `1px solid ${AppColors.line}`,
                  }}
                >
                  <td style={td}>{index + 1}</td>
                  <td style={td}>{advancing ? "☑" : ""}</td>
                  <td style={{ ...td, fontWeight: 800 }}>{s.player.name}</td>
                  <td style={td}>{s.wins}-{s.losses}</td>
                  <td style={td}>{s.matchPoints}</td>
                  <td style={td}>{s.pointDifference}</td>
                  <td style={td}>{s.pointsFor}</td>
                  <td style={td}>{s.buchholz}</td>
                  <td style={td}>
                    {s.history.map((r, i) => (
                      <span
                        key={i}
                        style={{
                          display: "inline-block", marginRight: 3, padding: "1px 6px", border: `1.5px solid ${AppColors.ink}`, borderRadius: 4,
                          fontSize: 11, fontWeight: 900, backgroundColor: r === "W" ? AppColors.lime : AppColors.coral, color: AppColors.ink,
                        }}
                      >
                        {r}
                      </span>
                    ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {showProceed && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: AppSpacing.md }}>
          <Btn label="Proceed to single elim" tone="primary" onPressed={onProceed} />
        </div>
      )}
    </NeoDialog>
  );
}

function SwissResultDialog({
  ctrl, match, onClose,
}: { ctrl: TournamentController; match: Match; onClose: () => void }) {
  const { isDark } = useUi();
  const [a, setA] = useState(`${match.scoreA ?? 0}`);
  const [b, setB] = useState(`${match.scoreB ?? 0}`);
  const save = () => {
    const sa = parseInt(a, 10) || 0;
    const sb = parseInt(b, 10) || 0;
    if (sa < 0 || sb < 0) return;
    ctrl.recordSwissScores(match.id, sa, sb);
    onClose();
  };
  return (
    <NeoDialog isDark={isDark} frost={0.6} maxWidth={460} ariaLabel="Record match scores" closeLabel="Cancel" onClose={onClose}>
      <DialogTitle text="Record match scores" />
      <div style={{ display: "flex", gap: AppSpacing.sm }}>
        <Field label={ctrl.playerById(match.playerA)?.name ?? "Player A"} type="number" value={a} onChange={setA} onEnter={save} />
        <Field label={ctrl.playerById(match.playerB)?.name ?? "Player B"} type="number" value={b} onChange={setB} onEnter={save} />
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: AppSpacing.md }}>
        <Btn label="Save result" tone="primary" onPressed={save} />
      </div>
    </NeoDialog>
  );
}

function HistoryDialog({ ctrl, onClose }: { ctrl: TournamentController; onClose: () => void }) {
  const { p, isDark } = useUi();
  return (
    <NeoDialog isDark={isDark} frost={0.6} maxWidth={560} ariaLabel="Tournament history" onClose={onClose}>
      <DialogTitle text={`${ctrl.tournamentName} history`} />
      <div style={{ maxHeight: 360, overflowY: "auto", border: `2px solid ${AppColors.ink}`, borderRadius: 8 }}>
        {ctrl.history.map((entry, i) => (
          <div key={i} style={{ padding: "10px 12px", color: p.ink, fontSize: 13, borderTop: i === 0 ? "none" : `1px solid ${AppColors.line}` }}>
            {entry}
          </div>
        ))}
      </div>
    </NeoDialog>
  );
}

function MessageDialog({ title, text, onClose }: { title: string; text: string; onClose: () => void }) {
  const { p, isDark } = useUi();
  return (
    <NeoDialog isDark={isDark} frost={0.6} maxWidth={380} ariaLabel={title} closeLabel="OK" onClose={onClose}>
      <DialogTitle text={title} />
      <p style={{ margin: 0, color: p.ink, fontSize: 15, fontWeight: 600 }}>{text}</p>
    </NeoDialog>
  );
}

function StageCompleteDialog({
  ctrl, onEnd, onContinue,
}: { ctrl: TournamentController; onEnd: () => void; onContinue: () => void }) {
  const { p, isDark } = useUi();
  return (
    <NeoDialog isDark={isDark} frost={0.6} maxWidth={480} ariaLabel="Stage complete" closeLabel="End" onClose={onEnd}>
      <DialogTitle text="Tournament stage complete" />
      <p style={{ margin: 0, color: p.ink, fontSize: 15, fontWeight: 600 }}>
        {ctrl.finalWinners.length} winners are ready. Create next bracket?
      </p>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: AppSpacing.md }}>
        <Btn label="Continue" tone="primary" onPressed={onContinue} />
      </div>
    </NeoDialog>
  );
}

type DialogState =
  | null
  | { kind: "standings"; showProceed: boolean }
  | { kind: "history" }
  | { kind: "swissResult"; matchId: string }
  | { kind: "message"; title: string; text: string }
  | { kind: "stageComplete" };

/* ═════════════════════════════════════════════════════════════════════════════
   PAGE
   ═════════════════════════════════════════════════════════════════════════════ */

export default function TournamentPage() {
  const [ctrl] = useState(() => new TournamentController());
  const version = useSyncExternalStore(ctrl.subscribe, ctrl.getVersion);

  const { isDark } = useAppTheme();
  const responsive = useResponsive();
  const navigate = useNavigate();
  const p = isDark ? AppPalette.dark : AppPalette.light;
  const shellWidth = responsive.isDesktop ? responsive.width * 0.8 : responsive.dashboardWidth;

  const [menuOpen, setMenuOpen] = useState(false);
  const [dialog, setDialog] = useState<DialogState>(null);
  const [playerName, setPlayerName] = useState("");
  const [playerCount, setPlayerCount] = useState("8");
  const [rosterOpen, setRosterOpen] = useState(true);
  const promptShown = useRef(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const nameInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ctrl.mount();
    return () => ctrl.dispose();
  }, [ctrl]);

  // Offer the next step once the tournament (or the Swiss stage) is finished.
  useEffect(() => {
    if (!ctrl.isComplete) {
      promptShown.current = false;
      return;
    }
    if (promptShown.current) return;
    promptShown.current = true;
    if (ctrl.isSwiss) setDialog({ kind: "standings", showProceed: true });
    else if (ctrl.bracketCount === 1) ctrl.finish();
    else setDialog({ kind: "stageComplete" });
  }, [ctrl, version]);

  const closeDialog = () => setDialog(null);
  const canClear = ctrl.canClear;
  const hasRoster = ctrl.players.length >= 2;
  const status = ctrl.status;
  const live = status === "running" || status === "paused";

  const addPlayer = () => {
    ctrl.addPlayer(playerName);
    setPlayerName("");
    nameInput.current?.focus();
  };
  const generatePlayers = () => {
    const n = parseInt(playerCount, 10);
    if (Number.isNaN(n) || n < 2 || n > MAX_PLAYERS) {
      setDialog({ kind: "message", title: "Invalid player count", text: `Number of players must be between 2 and ${MAX_PLAYERS}.` });
      return;
    }
    ctrl.generateNumberedPlayers(n);
  };
  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const ext = file.name.includes(".") ? file.name.split(".").pop() ?? "" : "";
    ctrl.importText(await file.text(), ext);
  };
  const switchStage = (type: BracketType) => {
    promptShown.current = type === "swiss";
    ctrl.switchStage(type);
  };
  const proceedToSingleElim = () => {
    closeDialog();
    ctrl.startSingleEliminationFromSwiss();
    promptShown.current = false;
  };

  const swissMatch = dialog?.kind === "swissResult" ? ctrl.matches.find((m) => m.id === dialog.matchId) : undefined;
  const openSwissResult = (m: Match) => {
    if (m.winnerId === null && m.playerA !== null && m.playerB !== null) setDialog({ kind: "swissResult", matchId: m.id });
  };

  const hasVisibleMatches = ctrl.groups.some((g) => ctrl.matches.filter((m) => m.group === g).some(ctrl.hasVisibleContent));

  return (
    <UiCtx.Provider value={{ p, isDark }}>
      <div
        style={{
          minHeight: "100vh", width: "100%", boxSizing: "border-box",
          ...dotBackground(p.background, isDark ? "#ffffff30" : "#00000030"),
          display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 42, paddingBottom: 80,
        }}
      >
        <FloatingButton
          onClick={() => setMenuOpen(!menuOpen)}
          color={menuOpen ? AppColors.coral : AppColors.lime}
          label={menuOpen ? "✖" : "☰"}
        />
        {menuOpen && (
          <div style={{ position: "fixed", bottom: 90, right: 24, zIndex: 1000, display: "flex", flexDirection: "column", gap: 8 }}>
            <NeoButton label="Home" isDark={isDark} onPressed={() => navigate("/")} />
          </div>
        )}

        <WireFrameFrosted width={shellWidth} isDark={isDark} frost={0.05}>
          <div style={{ padding: `${AppSpacing.xs}px 8px ${AppSpacing.sm}px` }}>
            {/* ── header ── */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: AppSpacing.sm, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <Eyebrow text={ctrl.tournamentName} />
                <h1 style={{ margin: "4px 0 8px", color: p.ink, fontSize: responsive.titleSize, fontWeight: 900, letterSpacing: 2.5, lineHeight: 1 }}>
                  {ctrl.isSwiss ? "Swiss Rounds" : "Tournament Bracket"}
                </h1>
                <div style={{ display: "flex", alignItems: "center", gap: AppSpacing.sm, flexWrap: "wrap" }}>
                  <StatusBadge status={status} />
                  <span style={{ border: `2px solid ${AppColors.ink}`, borderRadius: 8, backgroundColor: p.chip, color: p.ink, padding: "2px 10px", fontSize: 14, fontWeight: 900 }}>
                    👤 {ctrl.players.length}
                  </span>
                </div>
              </div>
              <div
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 8,
                  border: `2px solid ${AppColors.ink}`, backgroundColor: AppColors.ink, boxShadow: `4px 4px 0 ${AppColors.lime}`,
                  color: AppColors.white, fontSize: 20, fontWeight: 900, fontVariantNumeric: "tabular-nums",
                }}
              >
                <span aria-hidden style={{ color: AppColors.lime }}>⏱</span>
                {ctrl.elapsedLabel}
              </div>
            </div>

            <div style={{ height: AppSpacing.md }} />

            {/* ── roster controls ── */}
            <NeoSection title="ROSTER" isDark={isDark}>
              <div style={{ display: "flex", flexDirection: "column", gap: AppSpacing.sm }}>
                <Field label="Tournament name" value={ctrl.tournamentNameRaw} disabled={!canClear} onChange={(v) => ctrl.setTournamentName(v)} />
                <div style={{ display: "flex", alignItems: "flex-end", gap: AppSpacing.sm, flexWrap: "wrap" }}>
                  <Field label="Player count" type="number" width={130} value={playerCount} disabled={!canClear} onChange={setPlayerCount} onEnter={generatePlayers} />
                  <Btn label="Generate players" disabled={!canClear} onPressed={generatePlayers} />
                </div>
                <div style={{ display: "flex", alignItems: "flex-end", gap: AppSpacing.sm, flexWrap: "wrap" }}>
                  <label style={{ display: "flex", flex: 1, minWidth: 200 }}>
                    <input
                      ref={nameInput}
                      value={playerName}
                      disabled={!canClear}
                      placeholder="Add player name"
                      onChange={(e) => setPlayerName(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addPlayer()}
                      style={{
                        width: "100%", boxSizing: "border-box", border: `2px solid ${canClear ? AppColors.ink : p.ink + "55"}`, borderRadius: 8,
                        padding: "10px 10px", backgroundColor: p.card, color: p.ink, fontSize: 15, fontFamily: "inherit", opacity: canClear ? 1 : 0.6,
                      }}
                    />
                  </label>
                  <Btn label="Add" disabled={!canClear || !playerName.trim()} onPressed={addPlayer} />
                  <Btn label="Import" disabled={!canClear} onPressed={() => fileInput.current?.click()} />
                  <Btn label="Clear" disabled={!canClear || ctrl.players.length === 0} onPressed={() => ctrl.clearRoster()} />
                  <input ref={fileInput} type="file" accept=".csv,.json,.txt" onChange={onFile} style={{ display: "none" }} />
                </div>
              </div>
            </NeoSection>

            {/* ── tournament controls ── */}
            <NeoSection title="TOURNAMENT CONTROLS" isDark={isDark}>
              <div style={{ display: "flex", flexWrap: "wrap", gap: AppSpacing.sm, alignItems: "center", paddingBottom: 4 }}>
                <Btn label={ctrl.isSwiss ? "Build rounds" : "Build bracket"} disabled={!(hasRoster && canClear)} onPressed={() => ctrl.generateBracket()} />
                <Btn label="Randomize" disabled={!(hasRoster && canClear)} onPressed={() => ctrl.randomizeSeeding()} />
                <Btn label="Start" tone="primary" disabled={!(hasRoster && ctrl.hasBracket && status !== "running")} onPressed={() => ctrl.start()} />
                <Btn label="Pause" disabled={status !== "running"} onPressed={() => ctrl.pause()} />
                <Btn label="Stop" tone="danger" disabled={!live} onPressed={() => ctrl.stop()} />
                <Btn label="New tournament" disabled={!(status === "stopped" || status === "completed")} onPressed={() => ctrl.startNewTournament()} />
                <Btn label="Export CSV" disabled={!ctrl.hasExportData} onPressed={() => ctrl.exportCsv()} />
                <Btn label="History" disabled={!ctrl.hasHistory} onPressed={() => setDialog({ kind: "history" })} />

                <Select<BracketType>
                  value={ctrl.bracketType ?? ""}
                  placeholder="Select format"
                  disabled={!(canClear && hasRoster)}
                  options={[
                    { value: "singleElimination", label: "Single elim" },
                    { value: "swiss", label: "Swiss" },
                  ]}
                  onChange={(v) => ctrl.setBracketType(v)}
                />

                {ctrl.isSwiss ? (
                  <>
                    <Select<number>
                      value={ctrl.swissRounds}
                      disabled={!canClear}
                      options={Array.from({ length: 10 }, (_, i) => ({ value: i + 1, label: `${i + 1} rounds` }))}
                      onChange={(v) => ctrl.setSwissRounds(v)}
                    />
                    <Select<number>
                      value={clamp(ctrl.swissAdvanceCount, 2, Math.max(2, ctrl.players.length))}
                      disabled={!(canClear && hasRoster)}
                      options={Array.from({ length: Math.max(1, ctrl.players.length - 1) }, (_, i) => ({ value: i + 2, label: `Advance ${i + 2}` }))}
                      onChange={(v) => ctrl.setSwissAdvanceCount(v)}
                    />
                  </>
                ) : (
                  <>
                    <Select<ByeMode>
                      value={ctrl.byeMode}
                      disabled={!canClear}
                      options={[
                        { value: "none", label: "No byes" },
                        { value: "automatic", label: "Auto byes" },
                        { value: "custom", label: "Custom byes" },
                      ]}
                      onChange={(v) => ctrl.setByeMode(v)}
                    />
                    {ctrl.byeMode === "custom" && (
                      <Select<number>
                        value={clamp(ctrl.customByeCount, 0, Math.max(1, ctrl.players.length - 1))}
                        disabled={!(canClear && hasRoster)}
                        options={Array.from({ length: Math.max(1, ctrl.players.length - 1) + 1 }, (_, i) => ({ value: i, label: `${i} bye${i === 1 ? "" : "s"}` }))}
                        onChange={(v) => ctrl.setCustomByeCount(v)}
                      />
                    )}
                    <Select<number>
                      value={ctrl.bracketCount}
                      disabled={!(canClear && hasRoster)}
                      options={Array.from({ length: Math.min(8, Math.max(1, ctrl.players.length)) }, (_, i) => ({
                        value: i + 1,
                        label: `${i + 1} bracket${i === 0 ? "" : "s"}`,
                      }))}
                      onChange={(v) => ctrl.setBracketCount(v)}
                    />
                    <NeoChip
                      label="Custom seating"
                      fontSize={13}
                      isDark={isDark}
                      active={ctrl.customMatching}
                      activeColor={AppColors.lime}
                      onPressed={canClear ? () => ctrl.setCustomMatching(!ctrl.customMatching) : undefined}
                      style={{ height: 40, opacity: canClear ? 1 : 0.5 }}
                    />
                  </>
                )}
              </div>
            </NeoSection>

            {/* ── stage tabs ── */}
            {ctrl.hasStageTabs && (
              <div style={{ display: "flex", gap: AppSpacing.sm, marginBottom: AppSpacing.md, flexWrap: "wrap" }}>
                <NeoButton
                  label={`Swiss (${ctrl.swissStage?.round ?? ctrl.swissRound} rounds)`}
                  fontSize={14}
                  isDark={isDark}
                  color={ctrl.bracketType === "swiss" ? AppColors.lime : p.chip}
                  labelColor={ctrl.bracketType === "swiss" ? AppColors.ink : undefined}
                  onPressed={ctrl.bracketType === "swiss" ? undefined : () => switchStage("swiss")}
                />
                <NeoButton
                  label="Single elimination"
                  fontSize={14}
                  isDark={isDark}
                  color={ctrl.bracketType === "singleElimination" ? AppColors.lime : p.chip}
                  labelColor={ctrl.bracketType === "singleElimination" ? AppColors.ink : undefined}
                  onPressed={ctrl.bracketType === "singleElimination" ? undefined : () => switchStage("singleElimination")}
                />
              </div>
            )}

            {/* ── roster list ── */}
            {ctrl.players.length > 0 && (
              <NeoSection
                title="PLAYERS LIST"
                isDark={isDark}
                action={<Btn label={rosterOpen ? "Hide" : "Show"} onPressed={() => setRosterOpen(!rosterOpen)} />}
              >
                {rosterOpen && (
                  <div
                    style={{
                      display: "grid", gridTemplateColumns: `repeat(auto-fill, minmax(${responsive.isMobile ? 140 : 170}px, 1fr))`,
                      gap: 8, maxHeight: 450, overflowY: "auto", padding: "0 6px 6px 0",
                    }}
                  >
                    {ctrl.players.map((pl) => (
                      <div
                        key={pl.id}
                        style={{
                          display: "flex", alignItems: "center", gap: 6, minHeight: 44, boxSizing: "border-box", padding: "4px 8px",
                          border: `1.5px solid ${AppColors.ink}`, borderRadius: 8, backgroundColor: p.card, color: p.ink,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pl.name}</div>
                          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1, opacity: 0.7 }}>SEED {pl.seed}</div>
                        </div>
                        {canClear && (
                          <button
                            type="button"
                            aria-label={`Remove ${pl.name}`}
                            onClick={() => ctrl.removePlayer(pl.id)}
                            style={{ border: "none", background: "transparent", color: p.ink, cursor: "pointer", fontSize: 14, fontWeight: 900, padding: 2 }}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </NeoSection>
            )}

            {/* ── main content ── */}
            {ctrl.matches.length === 0 ? (
              <NeoEmpty
                isDark={isDark}
                text={
                  ctrl.players.length < 2
                    ? "Add at least 2 players to begin. Enter player names above to get started."
                    : ctrl.isSwiss
                      ? "Build Swiss rounds to start the tournament. Choose the number of rounds, then build."
                      : 'Build a bracket to start the tournament. Click "Build bracket" to generate the tournament tree.'
                }
              />
            ) : ctrl.isSwiss ? (
              <SwissRounds ctrl={ctrl} onSwissResult={openSwissResult} onStandings={() => setDialog({ kind: "standings", showProceed: ctrl.swissComplete })} />
            ) : !hasVisibleMatches ? (
              <div>
                <BracketInfo ctrl={ctrl} />
                <p style={{ textAlign: "center", color: p.ink, fontSize: 14, padding: 30 }}>
                  {ctrl.players.length} players. Scroll to view the bracket.
                </p>
              </div>
            ) : (
              <div>
                <div style={{ marginBottom: AppSpacing.sm }}>
                  <BracketInfo ctrl={ctrl} />
                </div>
                {ctrl.groups.map((g) => (
                  <BracketGroup key={g} ctrl={ctrl} group={g} onSwissResult={openSwissResult} />
                ))}
              </div>
            )}
          </div>
        </WireFrameFrosted>

        {/* ── dialogs ── */}
        {dialog?.kind === "standings" && (
          <StandingsDialog ctrl={ctrl} showProceed={dialog.showProceed} onClose={closeDialog} onProceed={proceedToSingleElim} />
        )}
        {dialog?.kind === "history" && <HistoryDialog ctrl={ctrl} onClose={closeDialog} />}
        {dialog?.kind === "swissResult" && swissMatch && <SwissResultDialog ctrl={ctrl} match={swissMatch} onClose={closeDialog} />}
        {dialog?.kind === "message" && <MessageDialog title={dialog.title} text={dialog.text} onClose={closeDialog} />}
        {dialog?.kind === "stageComplete" && (
          <StageCompleteDialog
            ctrl={ctrl}
            onEnd={() => {
              closeDialog();
              ctrl.finish();
            }}
            onContinue={() => {
              closeDialog();
              ctrl.reseedWinners();
              promptShown.current = false;
            }}
          />
        )}
      </div>
    </UiCtx.Provider>
  );
}