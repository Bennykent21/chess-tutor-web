/**
 * Train's "Win this" endgames and "Convert this" middlegames (ported from the Android app's
 * domain/train package): the position sets, which to play now, and when a position played out
 * against Stockfish is won, held or let slip.
 */
import { Chess } from "chess.js";

export type PositionKind = "endgame" | "middlegame";
export type PositionGoal = "win" | "hold" | "convert";

export interface TrainPosition {
  id: string;
  setId: string;
  title: string;
  fen: string;
  goal: PositionGoal;
  aim: string;
}

export interface PositionSet {
  id: string;
  kind: PositionKind;
  title: string;
  positions: TrainPosition[];
}

export function sideOf(position: TrainPosition): "w" | "b" {
  return position.fen.split(" ")[1] === "b" ? "b" : "w";
}

const GOALS: PositionGoal[] = ["win", "hold", "convert"];

export function parsePositionSets(raw: any): PositionSet[] {
  const sets = raw?.sets;
  if (!Array.isArray(sets)) throw new Error('positions.json: no "sets"');
  return sets.map((set: any) => {
    const id = String(set.id);
    const goal: PositionGoal = GOALS.includes(set.goal) ? set.goal : "win";
    const kind: PositionKind = set.kind === "middlegame" ? "middlegame" : "endgame";
    const positions: TrainPosition[] = (set.positions ?? []).map((p: any, n: number) => {
      const own = typeof p === "string" ? null : p;
      const fen = typeof p === "string" ? p : String(p.fen);
      new Chess(fen);
      return {
        id: `${id}-${n + 1}`,
        setId: id,
        title: String(set.title),
        fen,
        goal: own && GOALS.includes(own.goal) ? own.goal : goal,
        aim: own?.aim ?? String(set.aim)
      };
    });
    if (!positions.length) throw new Error(`positions.json: set "${id}" has no positions`);
    return { id, kind, title: String(set.title), positions };
  });
}

let cached: Promise<PositionSet[]> | null = null;

export function loadPositionSets(): Promise<PositionSet[]> {
  if (!cached) {
    cached = fetch("/data/positions/positions.json")
      .then(r => (r.ok ? r.json() : { sets: [] }))
      .then(parsePositionSets)
      .catch(() => []);
  }
  return cached;
}

/** How the learner did with one position: ever won, and the day a slipped one comes back. */
export interface PositionRecord {
  won: boolean;
  dueDay: number | null;
}

/** Days since the epoch in the learner's own time zone. */
export function epochDay(ms = Date.now()): number {
  const d = new Date(ms);
  return Math.floor(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) / 86_400_000);
}

/** The positions not yet won and not waiting for another day, in order; else the whole set again. */
export function positionQueue(set: PositionSet, records: Record<string, PositionRecord>, today: number): TrainPosition[] {
  const open = set.positions.filter(p => {
    const r = records[p.id];
    return !r || (!r.won && (r.dueDay ?? 0) <= today);
  });
  return open.length ? open : set.positions;
}

export type PositionOutcome = "playing" | "won" | "held" | "slipped";

/** An engine score from the learner's side. */
export interface LearnerScore {
  cp: number | null;
  mate: number | null;
}

export function learnerScore(whiteCp: number | null, whiteMate: number | null, learner: "w" | "b"): LearnerScore {
  const sign = learner === "w" ? 1 : -1;
  return { cp: whiteCp === null ? null : whiteCp * sign, mate: whiteMate === null ? null : whiteMate * sign };
}

export const WIN_KEPT_CP = 150;
export const PROMOTED_CP = 1000;
export const CONVERTED_CP = 500;
export const CONVERT_KEPT_CP = 80;
export const HOLD_LOST_CP = -300;
export const HOLD_MOVES = 15;

/** The outcome when the game itself has ended (mate, stalemate, a draw by rule), else null. */
export function endedOutcome(goal: PositionGoal, chess: Chess, learner: "w" | "b"): PositionOutcome | null {
  if (chess.isCheckmate()) return chess.turn() === learner ? "slipped" : "won";
  if (chess.isGameOver() || chess.isDraw()) return goal === "hold" ? "held" : "slipped";
  return null;
}

/** The outcome after the learner's move, from the engine's score of the position it left. */
export function scoredOutcome(goal: PositionGoal, score: LearnerScore, promoted: boolean, learnerMoves: number): PositionOutcome {
  const cp = score.cp ?? 0;
  const winning = score.mate !== null && score.mate > 0;
  const losing = score.mate !== null && score.mate < 0;
  switch (goal) {
    case "win":
      if (losing || (!winning && cp < WIN_KEPT_CP)) return "slipped";
      if (promoted && (winning || cp >= PROMOTED_CP)) return "won";
      return "playing";
    case "convert":
      if (winning || cp >= CONVERTED_CP) return "won";
      if (losing || cp < CONVERT_KEPT_CP) return "slipped";
      return "playing";
    case "hold":
      if (losing || (score.mate === null && cp <= HOLD_LOST_CP)) return "slipped";
      if (learnerMoves >= HOLD_MOVES) return "held";
      return "playing";
  }
}
