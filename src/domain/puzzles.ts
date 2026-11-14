import { Chess } from "chess.js";
import { parseUci } from "../lib/chessUtils";

export interface Puzzle {
  id: string;
  fen: string;
  moves: string[]; // moves[0] is opponent's setup move; moves[1], moves[3]... are solver moves
  rating: number;
  primaryTheme: string;
  themes: string[];
  popularity: number;
  alternatives: string[][]; // alternatives[step] = accepted alternative UCI moves
}

export type PuzzleGoalId = "checkmate" | "win-material" | "defend" | "endgame";

export const PUZZLE_GOALS: { id: PuzzleGoalId; title: string; subtitle: string }[] = [
  { id: "checkmate", title: "Checkmate", subtitle: "Force mate or spot mating nets" },
  { id: "win-material", title: "Win material", subtitle: "Forks, pins, skewers, and tactics" },
  { id: "defend", title: "Defend", subtitle: "Find saving moves and equality" },
  { id: "endgame", title: "Endgame", subtitle: "Convert advantages and promote pawns" }
];

export const PUZZLE_THEME_NAMES: Record<string, string> = {
  mateIn1: "Mate in 1",
  mateIn2: "Mate in 2",
  mateIn3: "Mate in 3",
  backRankMate: "Back-rank mate",
  smotheredMate: "Smothered mate",
  anastasiaMate: "Anastasia's mate",
  arabianMate: "Arabian mate",
  hookMate: "Hook mate",
  fork: "Fork",
  pin: "Pin",
  skewer: "Skewer",
  discoveredAttack: "Discovered attack",
  doubleCheck: "Double check",
  hangingPiece: "Hanging piece",
  trappedPiece: "Trapped piece",
  capturingDefender: "Remove the defender",
  deflection: "Deflection",
  attraction: "Attraction",
  clearance: "Clearance",
  interference: "Interference",
  xRayAttack: "X-ray attack",
  intermezzo: "In-between move",
  quietMove: "Quiet move",
  zugzwang: "Zugzwang",
  sacrifice: "Sacrifice",
  exposedKing: "Exposed king",
  defensiveMove: "Defensive move",
  advancedPawn: "Advanced pawn",
  promotion: "Promotion",
  pawnEndgame: "Pawn endgame",
  rookEndgame: "Rook endgame",
  bishopEndgame: "Bishop endgame",
  knightEndgame: "Knight endgame",
  queenEndgame: "Queen endgame"
};

export function isKnownTheme(theme: string): boolean {
  return theme in PUZZLE_THEME_NAMES;
}

export function displayThemeName(theme: string): string {
  if (PUZZLE_THEME_NAMES[theme]) return PUZZLE_THEME_NAMES[theme];
  const spaced = theme.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

const ENDGAME_TAGS = new Set([
  "pawnEndgame",
  "rookEndgame",
  "bishopEndgame",
  "knightEndgame",
  "queenEndgame",
  "queenRookEndgame",
  "endgame"
]);
const DEFENCE_TAGS = new Set(["defensiveMove", "equality"]);

export function puzzleGoalOf(puzzle: Puzzle): PuzzleGoalId {
  const tags = [puzzle.primaryTheme, ...puzzle.themes];
  if (tags.some(t => t === "mate" || t.startsWith("mateIn") || t.endsWith("Mate"))) return "checkmate";
  if (tags.some(t => DEFENCE_TAGS.has(t))) return "defend";
  if (tags.some(t => ENDGAME_TAGS.has(t))) return "endgame";
  return "win-material";
}

export function puzzlePrompt(puzzle: Puzzle): string {
  if (puzzle.rating >= 1800) return "Find the best move";
  const allTags = [puzzle.primaryTheme, ...puzzle.themes];
  const mateTag = puzzle.rating < 1200 ? allTags.find(t => /^mateIn\d+$/.test(t)) : undefined;
  const mateIn = mateTag ? Number(mateTag.slice(6)) : null;
  const goal = puzzleGoalOf(puzzle);
  if (goal === "checkmate") {
    if (mateIn === 1) return "Find the checkmate in one move";
    if (mateIn && mateIn > 1) return `Find mate in ${mateIn}`;
    return "Find the checkmate";
  }
  if (goal === "defend") return "Save the game: find the best defence";
  if (goal === "endgame") return "Find the winning plan in this endgame";
  return "Can you win material?";
}

const UCI_RE = /^[a-h][1-8][a-h][1-8][qrbn]?$/;

export function parsePuzzleLine(line: string): Puzzle | null {
  if (!line.trim()) return null;
  const cols = line.replace(/\r?\n$/, "").split("\t");
  if (cols.length < 6) return null;
  const id = cols[0].trim();
  const fen = cols[1].trim();
  const moves = cols[2].trim().split(" ").filter(Boolean).map(m => m.toLowerCase());
  const rating = Number(cols[3].trim());
  const primaryTheme = cols[4].trim();
  const rawThemes = cols[5].trim().split(" ").filter(Boolean);
  const popularity = cols[6] ? Number(cols[6].trim()) || 0 : 0;
  const altCol = cols[7]?.trim() ?? "";
  const alternatives = altCol
    ? altCol.split("|").map(step =>
        step
          .split(",")
          .map(s => s.trim().toLowerCase())
          .filter(s => UCI_RE.test(s))
      )
    : [];

  if (!id || !primaryTheme || !Number.isFinite(rating) || fen.split(" ").length < 4) return null;
  if (moves.length < 2 || moves.some(m => !UCI_RE.test(m))) return null;

  return {
    id,
    fen,
    moves,
    rating,
    primaryTheme,
    themes: rawThemes.length ? Array.from(new Set(rawThemes)) : [primaryTheme],
    popularity,
    alternatives
  };
}

export class PuzzlePack {
  readonly puzzles: Puzzle[];
  private readonly byId: Map<string, Puzzle>;

  constructor(puzzles: Puzzle[]) {
    this.puzzles = [...puzzles].sort((a, b) => a.rating - b.rating || a.id.localeCompare(b.id));
    this.byId = new Map(this.puzzles.map(p => [p.id, p]));
  }

  get size(): number {
    return this.puzzles.length;
  }

  get isEmpty(): boolean {
    return this.puzzles.length === 0;
  }

  get(id: string): Puzzle | undefined {
    return this.byId.get(id);
  }

  static parseTsv(tsvText: string): PuzzlePack {
    const parsed: Puzzle[] = [];
    const seen = new Set<string>();
    for (const line of tsvText.split(/\r?\n/)) {
      if (!line.trim()) continue;
      const p = parsePuzzleLine(line);
      if (p && !seen.has(p.id)) {
        seen.add(p.id);
        parsed.push(p);
      }
    }
    return new PuzzlePack(parsed);
  }
}

let cachedPackPromise: Promise<PuzzlePack> | null = null;

export async function loadPuzzlePack(): Promise<PuzzlePack> {
  if (!cachedPackPromise) {
    cachedPackPromise = fetch("/data/puzzles.tsv")
      .then(async res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();
        return PuzzlePack.parseTsv(text);
      })
      .catch(() => new PuzzlePack([]));
  }
  return cachedPackPromise;
}

/* ==========================================================================
   Worlds, 50 Levels, Elo Rating, XP, Player Level, Streaks
   ========================================================================== */

export type WorldAccent = "lime" | "teal" | "violet" | "coral" | "gold";

export interface PuzzleWorld {
  number: number;
  id: string;
  title: string;
  tagline: string;
  accent: WorldAccent;
  badge: string;
  minLevel: number;
  maxLevel: number;
}

export const PUZZLE_WORLDS: PuzzleWorld[] = [
  { number: 1, id: "meadow", title: "Sunrise Meadow", tagline: "First steps: mates in one and loose pieces", accent: "lime", badge: "Meadow Explorer", minLevel: 1, maxLevel: 10 },
  { number: 2, id: "tides", title: "Tide Pools", tagline: "Forks, pins and the first combinations", accent: "teal", badge: "Tide Reader", minLevel: 11, maxLevel: 20 },
  { number: 3, id: "caves", title: "Crystal Caves", tagline: "Hidden moves and deeper tactics", accent: "violet", badge: "Cave Diver", minLevel: 21, maxLevel: 30 },
  { number: 4, id: "ridge", title: "Ember Ridge", tagline: "Sharp attacks and precise endgames", accent: "coral", badge: "Ridge Climber", minLevel: 31, maxLevel: 40 },
  { number: 5, id: "summit", title: "Summit of Stars", tagline: "Master-level puzzles", accent: "gold", badge: "Star Seeker", minLevel: 41, maxLevel: 50 }
];

export const PUZZLE_LEVEL_COUNT = 50;
export const PUZZLES_PER_LEVEL = 5;
export const PUZZLES_TO_PASS_LEVEL = 4;

export function worldOfLevel(level: number): PuzzleWorld {
  return PUZZLE_WORLDS.find(w => level >= w.minLevel && level <= w.maxLevel) ?? PUZZLE_WORLDS[0];
}

export function levelTargetRating(level: number): number {
  const n = Math.max(1, Math.min(PUZZLE_LEVEL_COUNT, level));
  return Math.round(400 + ((n - 1) * (2400 - 400)) / (PUZZLE_LEVEL_COUNT - 1));
}

function seededRandom(seed: number): () => number {
  let state = (seed >>> 0) || 1;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function seededShuffle<T>(arr: T[], seed: number): T[] {
  const copy = [...arr];
  const rand = seededRandom(seed);
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function puzzlesForLevel(
  level: number,
  playIndex: number,
  pack: PuzzlePack,
  avoidIds: Set<string> = new Set()
): Puzzle[] {
  if (pack.isEmpty) return [];
  const target = levelTargetRating(level);
  let window = 60;
  let nearby: Puzzle[] = [];
  let fresh: Puzzle[] = [];
  while (true) {
    nearby = pack.puzzles.filter(p => Math.abs(p.rating - target) <= window);
    fresh = nearby.filter(p => !avoidIds.has(p.id));
    if (fresh.length >= PUZZLES_PER_LEVEL * 3 || window > 1200) break;
    window *= 2;
  }
  const pool = fresh.length >= PUZZLES_PER_LEVEL ? fresh : nearby;
  const sorted = [...pool].sort((a, b) => a.id.localeCompare(b.id));
  const shuffled = seededShuffle(sorted, level * 7919 + playIndex * 104729);
  const picked: Puzzle[] = [];
  const themes = new Set<string>();
  for (const p of shuffled) {
    if (picked.length === PUZZLES_PER_LEVEL) break;
    if (!themes.has(p.primaryTheme)) {
      themes.add(p.primaryTheme);
      picked.push(p);
    }
  }
  for (const p of shuffled) {
    if (picked.length === PUZZLES_PER_LEVEL) break;
    if (!picked.includes(p)) picked.push(p);
  }
  return picked.sort((a, b) => a.rating - b.rating);
}

export function updatePuzzleElo(userRating: number, puzzleRating: number, cleanSolved: boolean, k = 32): number {
  const expected = 1 / (1 + Math.pow(10, (puzzleRating - userRating) / 400));
  const score = cleanSolved ? 1 : 0;
  return Math.max(400, Math.min(3000, Math.round(userRating + k * (score - expected))));
}

export function xpForPuzzleSolve(args: {
  solved: boolean;
  clean: boolean;
  revealed: boolean;
  elapsedMs: number;
  cleanStreak: number;
}): number {
  if (args.revealed || !args.solved) return 0;
  if (!args.clean) return 4;
  const speed = args.elapsedMs <= 20000 ? 5 : args.elapsedMs <= 40000 ? 2 : 0;
  const streakBonus = Math.max(0, Math.min(5, args.cleanStreak - 1));
  return 10 + speed + streakBonus;
}

export interface PlayerLevelInfo {
  level: number;
  xpIntoLevel: number;
  xpForNext: number;
  progress: number;
}

export function xpNeededForLevel(level: number): number {
  return 50 + 10 * (level - 1);
}

export function playerLevelFromXp(totalXp: number): PlayerLevelInfo {
  let level = 1;
  let left = Math.max(0, totalXp);
  while (left >= xpNeededForLevel(level)) {
    left -= xpNeededForLevel(level);
    level++;
  }
  const xpForNext = xpNeededForLevel(level);
  return {
    level,
    xpIntoLevel: left,
    xpForNext,
    progress: xpForNext > 0 ? left / xpForNext : 0
  };
}

/* ==========================================================================
   Modes: Daily, By Theme, Custom, Rush, Mistakes
   ========================================================================== */

export type DifficultyOffset = "easier" | "matched" | "harder";

export const DIFFICULTY_OFFSETS: Record<DifficultyOffset, { label: string; offset: number }> = {
  easier: { label: "Easier", offset: -250 },
  matched: { label: "Matched", offset: 0 },
  harder: { label: "Harder", offset: 250 }
};

export interface RatingBand {
  id: string;
  label: string;
  min: number;
  max: number;
}

export const RATING_BANDS: RatingBand[] = [
  { id: "400-800", label: "400 – 800", min: 400, max: 799 },
  { id: "800-1200", label: "800 – 1200", min: 800, max: 1199 },
  { id: "1200-1600", label: "1200 – 1600", min: 1200, max: 1599 },
  { id: "1600-2000", label: "1600 – 2000", min: 1600, max: 1999 },
  { id: "2000+", label: "2000+", min: 2000, max: 3000 }
];

export function dailyPuzzleForDate(pack: PuzzlePack, date = new Date()): Puzzle | null {
  if (pack.isEmpty) return null;
  const pool = pack.puzzles.filter(p => p.rating >= 1000 && p.rating <= 1800);
  const targetPool = (pool.length ? pool : pack.puzzles).slice().sort((a, b) => a.id.localeCompare(b.id));
  const utcDay = Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000);
  const idx = Math.abs((utcDay * 2654435761) % targetPool.length);
  return targetPool[idx];
}

export function patternsForGoal(pack: PuzzlePack, goal: PuzzleGoalId): { theme: string; label: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const p of pack.puzzles) {
    if (puzzleGoalOf(p) !== goal) continue;
    const seen = new Set<string>();
    for (const t of [p.primaryTheme, ...p.themes]) {
      if (isKnownTheme(t) && !seen.has(t)) {
        seen.add(t);
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
  }
  return Array.from(counts.entries())
    .map(([theme, count]) => ({ theme, label: displayThemeName(theme), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export function selectThemedPuzzles(
  pack: PuzzlePack,
  goal: PuzzleGoalId,
  pattern: string | null,
  targetRating: number,
  count = 10,
  seed = Date.now(),
  avoidIds: Set<string> = new Set()
): Puzzle[] {
  const matching = pack.puzzles.filter(
    p => puzzleGoalOf(p) === goal && (!pattern || p.primaryTheme === pattern || p.themes.includes(pattern))
  );
  return selectNearRating(matching, targetRating, count, seed, avoidIds);
}

export function selectRelatedPuzzles(
  pack: PuzzlePack,
  themes: string[],
  targetRating: number,
  count = 10,
  seed = Date.now(),
  avoidIds: Set<string> = new Set()
): Puzzle[] {
  const wanted = new Set(themes);
  const matching = pack.puzzles.filter(p => wanted.has(p.primaryTheme) || p.themes.some(t => wanted.has(t)));
  return selectNearRating(matching, targetRating, count, seed, avoidIds);
}

export function selectCustomPuzzles(
  pack: PuzzlePack,
  band: RatingBand,
  pattern: string | null,
  count: number,
  seed = Date.now(),
  avoidIds: Set<string> = new Set()
): Puzzle[] {
  const matching = pack.puzzles.filter(
    p => p.rating >= band.min && p.rating <= band.max && (!pattern || p.primaryTheme === pattern || p.themes.includes(pattern))
  );
  const fresh = matching.filter(p => !avoidIds.has(p.id));
  const pool = fresh.length >= count ? fresh : matching;
  return seededShuffle(pool, seed).slice(0, count).sort((a, b) => a.rating - b.rating);
}

function selectNearRating(
  pool: Puzzle[],
  rating: number,
  count: number,
  seed: number,
  avoidIds: Set<string>
): Puzzle[] {
  if (!pool.length) return [];
  let window = 100;
  let near: Puzzle[] = [];
  while (true) {
    near = pool.filter(p => Math.abs(p.rating - rating) <= window && !avoidIds.has(p.id));
    if (near.length >= count * 2 || window > 2000) break;
    window *= 2;
  }
  if (near.length < count) {
    near = pool.filter(p => Math.abs(p.rating - rating) <= window);
  }
  return seededShuffle(near, seed).slice(0, count).sort((a, b) => a.rating - b.rating);
}

export class RushSelector {
  private readonly pack: PuzzlePack;
  private readonly startRating: number;
  private readonly used = new Set<string>();

  constructor(pack: PuzzlePack, playerRating: number) {
    this.pack = pack;
    this.startRating = Math.max(400, playerRating - 300);
  }

  next(solvedSoFar: number): Puzzle | null {
    const target = this.startRating + solvedSoFar * 60;
    let window = 75;
    while (window <= 3000) {
      const near = this.pack.puzzles.filter(p => Math.abs(p.rating - target) <= window && !this.used.has(p.id));
      if (near.length) {
        const pick = near[Math.floor(Math.random() * near.length)];
        this.used.add(pick.id);
        return pick;
      }
      window *= 2;
    }
    return null;
  }
}

/* ==========================================================================
   Interactive PuzzleSession (Multi-move + Alternatives + Checkmate)
   ========================================================================== */

export type PuzzleMoveOutcome =
  | { kind: "correct"; replyUci: string | null; solved: boolean; alternative: boolean }
  | { kind: "wrong"; mistakes: number }
  | { kind: "illegal" }
  | { kind: "not-solving" };

export class PuzzleSession {
  readonly puzzle: Puzzle;
  readonly openingMove: string;
  readonly solverColor: "w" | "b";
  private readonly chess: Chess;
  private moveIndex = 1;
  private hintLevel = 0;
  status: "solving" | "solved" | "revealed" = "solving";
  mistakes = 0;
  hintsUsed = 0;
  solvedWithAlternative = false;
  lastMove: string | null = null;

  constructor(puzzle: Puzzle) {
    this.puzzle = puzzle;
    this.chess = new Chess(puzzle.fen);
    this.openingMove = puzzle.moves[0];
    const parsed = parseUci(this.openingMove);
    if (parsed) {
      this.chess.move({ from: parsed.from, to: parsed.to, promotion: parsed.promotion ?? "q" });
      this.lastMove = this.openingMove;
    }
    this.solverColor = this.chess.turn();
  }

  get fen(): string {
    return this.chess.fen();
  }

  get currentStepIndex(): number {
    return Math.floor((this.moveIndex - 1) / 2);
  }

  get expectedMove(): string {
    return this.puzzle.moves[this.moveIndex] ?? "";
  }

  submit(uci: string): PuzzleMoveOutcome {
    if (this.status !== "solving") return { kind: "not-solving" };
    const clean = uci.trim().toLowerCase();
    const parsed = parseUci(clean);
    if (!parsed) return { kind: "illegal" };

    const legal = this.chess.moves({ verbose: true });
    const match = legal.find(
      m => m.from === parsed.from && m.to === parsed.to && (!parsed.promotion || m.promotion === parsed.promotion)
    );
    if (!match) return { kind: "illegal" };

    const expected = this.puzzle.moves[this.moveIndex];
    const isExpected = clean === expected;
    const step = this.currentStepIndex;
    const alts = this.puzzle.alternatives[step] ?? [];
    const isAlt = !isExpected && alts.includes(clean);

    // Check if the move delivers immediate checkmate
    const trial = new Chess(this.chess.fen());
    trial.move({ from: parsed.from, to: parsed.to, promotion: parsed.promotion ?? "q" });
    const deliversMate = !isExpected && trial.isCheckmate();

    if (!isExpected && !isAlt && !deliversMate) {
      this.mistakes++;
      return { kind: "wrong", mistakes: this.mistakes };
    }

    // Play the solver's move
    this.chess.move({ from: parsed.from, to: parsed.to, promotion: parsed.promotion ?? "q" });
    this.lastMove = clean;
    this.hintLevel = 0;

    if (isAlt || deliversMate) {
      this.solvedWithAlternative = true;
      this.status = "solved";
      return { kind: "correct", replyUci: null, solved: true, alternative: true };
    }

    // Check if puzzle finishes or opponent replies
    if (this.moveIndex + 1 >= this.puzzle.moves.length) {
      this.status = "solved";
      return { kind: "correct", replyUci: null, solved: true, alternative: false };
    }

    const replyUci = this.puzzle.moves[this.moveIndex + 1];
    const parsedReply = parseUci(replyUci);
    if (parsedReply) {
      this.chess.move({ from: parsedReply.from, to: parsedReply.to, promotion: parsedReply.promotion ?? "q" });
      this.lastMove = replyUci;
    }
    this.moveIndex += 2;
    const done = this.moveIndex >= this.puzzle.moves.length;
    if (done) this.status = "solved";
    return { kind: "correct", replyUci, solved: done, alternative: false };
  }

  requestHint(): { kind: "piece"; square: string } | { kind: "move"; uci: string } | null {
    if (this.status !== "solving") return null;
    const expected = this.expectedMove;
    if (!expected) return null;
    this.hintsUsed++;
    if (this.hintLevel === 0) {
      this.hintLevel = 1;
      return { kind: "piece", square: expected.slice(0, 2) };
    }
    return { kind: "move", uci: expected };
  }

  revealSolution(): string[] {
    if (this.status === "solved") return [];
    this.status = "revealed";
    const remaining: string[] = [];
    while (this.moveIndex < this.puzzle.moves.length) {
      const uci = this.puzzle.moves[this.moveIndex];
      const parsed = parseUci(uci);
      if (parsed) {
        this.chess.move({ from: parsed.from, to: parsed.to, promotion: parsed.promotion ?? "q" });
        this.lastMove = uci;
        remaining.push(uci);
      }
      this.moveIndex++;
    }
    return remaining;
  }

  get clean(): boolean {
    return this.status === "solved" && this.mistakes === 0 && this.hintsUsed === 0;
  }
}
