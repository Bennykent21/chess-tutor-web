import { Chess } from "chess.js";
import { parseUci } from "../lib/chessUtils";
import { StoredAccountGame, TutorGameRecord } from "../lib/storage";
import { PuzzleHistoryEntry } from "../lib/storage";
import { displayThemeName, isKnownTheme } from "./puzzles";

/* ==========================================================================
   Win Probability & Lichess Accuracy
   ========================================================================== */

export function winProbabilityFromCp(cp: number): number {
  const clamped = Math.max(-4000, Math.min(4000, cp));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * clamped)) - 1);
}

export function winProbabilityFromScore(centipawns: number | null, mateIn: number | null): number {
  if (mateIn !== null) {
    if (mateIn > 0) return 100;
    if (mateIn < 0) return 0;
    return (centipawns ?? 0) >= 0 ? 100 : 0;
  }
  return winProbabilityFromCp(centipawns ?? 0);
}

export function whiteBarFraction(centipawns: number | null, mateIn: number | null): number {
  if (mateIn !== null) return mateIn > 0 ? 1 : 0;
  if (centipawns === null) return 0.5;
  const pct = winProbabilityFromCp(centipawns) / 100;
  return Math.max(0.03, Math.min(0.97, pct));
}

export function lichessWinPercent(centipawns: number | null, mateIn: number | null): number {
  const cp =
    mateIn !== null && mateIn !== 0
      ? mateIn > 0
        ? 1000
        : -1000
      : mateIn === 0
      ? (centipawns ?? 0) >= 0
        ? 1000
        : -1000
      : Math.max(-1000, Math.min(1000, centipawns ?? 0));
  return 50 + 50 * (2 / (1 + Math.exp(-0.00368208 * cp)) - 1);
}

export function lichessMoveAccuracy(before: number, after: number): number {
  if (after >= before) return 100;
  const raw = 103.1668100711649 * Math.exp(-0.04354415386753951 * (before - after)) - 3.166924740191411;
  return Math.max(0, Math.min(100, raw + 1));
}

export function lichessGameAccuracy(whiteWins: number[]): { white: number | null; black: number | null } {
  const moves = whiteWins.length - 1;
  if (moves < 1) return { white: null, black: null };
  const windowSize = Math.max(2, Math.min(8, Math.floor(moves / 10)));
  const firstWindow = whiteWins.slice(0, windowSize);
  const windows: number[][] = [];
  for (let i = 0; i < Math.max(0, windowSize - 2); i++) windows.push(firstWindow);
  for (let i = 0; i + windowSize <= whiteWins.length; i++) {
    windows.push(whiteWins.slice(i, i + windowSize));
  }
  if (!windows.length) windows.push(whiteWins);

  const stdDev = (xs: number[]) => {
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    return Math.sqrt(xs.reduce((s, x) => s + (x - mean) * (x - mean), 0) / xs.length);
  };
  const weights = windows.map(w => Math.max(0.5, Math.min(12, stdDev(w))));

  const buckets: { w: [number, number][]; b: [number, number][] } = { w: [], b: [] };
  for (let i = 0; i < moves; i++) {
    const isWhite = i % 2 === 0;
    const before = isWhite ? whiteWins[i] : 100 - whiteWins[i];
    const after = isWhite ? whiteWins[i + 1] : 100 - whiteWins[i + 1];
    const weight = weights[i] ?? weights[weights.length - 1];
    buckets[isWhite ? "w" : "b"].push([lichessMoveAccuracy(before, after), weight]);
  }

  const calc = (list: [number, number][]) => {
    if (!list.length) return null;
    const totalW = list.reduce((s, [, w]) => s + w, 0);
    const weighted = list.reduce((s, [a, w]) => s + a * w, 0) / totalW;
    const harmonic = list.length / list.reduce((s, [a]) => s + 1 / Math.max(0.01, a), 0);
    return Math.round(((weighted + harmonic) / 2) * 10) / 10;
  };

  return { white: calc(buckets.w), black: calc(buckets.b) };
}

/* ==========================================================================
   Move Classification & Game Review
   ========================================================================== */

export type MoveQualityId =
  | "book"
  | "forced"
  | "brilliant"
  | "great"
  | "best"
  | "excellent"
  | "good"
  | "inaccuracy"
  | "miss"
  | "mistake"
  | "blunder";

export const MOVE_QUALITY_META: Record<MoveQualityId, { label: string; symbol: string; color: string }> = {
  book: { label: "Book", symbol: "Bk", color: "#B59E80" },
  forced: { label: "Forced", symbol: "→", color: "#9AA5B1" },
  brilliant: { label: "Brilliant", symbol: "!!", color: "#4CC3D9" },
  great: { label: "Great", symbol: "!", color: "#8AA4F0" },
  best: { label: "Best", symbol: "★", color: "#6CC08E" },
  excellent: { label: "Excellent", symbol: "✓", color: "#86C99B" },
  good: { label: "Good", symbol: "·", color: "#93AE98" },
  inaccuracy: { label: "Inaccuracy", symbol: "?!", color: "#E8B44A" },
  miss: { label: "Miss", symbol: "×", color: "#F07AA0" },
  mistake: { label: "Mistake", symbol: "?", color: "#EE8B4A" },
  blunder: { label: "Blunder", symbol: "??", color: "#EC6A5C" }
};

export interface PlyEval {
  ply: number;
  centipawns: number | null;
  mate: number | null;
  bestMove: string;
  line: string[];
  depth?: number;
  secondCentipawns?: number | null;
  secondMate?: number | null;
}

export interface ReviewedMove {
  ply: number;
  uci: string;
  san: string;
  mover: "w" | "b";
  fenBefore: string;
  bestMove: string;
  bestSan: string;
  line: string[];
  winBefore: number;
  winAfter: number;
  loss: number;
  accuracy: number;
  quality: MoveQualityId;
  phase: "opening" | "middlegame" | "endgame";
  centipawnsAfter: number | null;
  mateAfter: number | null;
}

export interface GameReviewReport {
  whiteAccuracy: number | null;
  blackAccuracy: number | null;
  whiteCounts: Record<MoveQualityId, number>;
  blackCounts: Record<MoveQualityId, number>;
  moves: ReviewedMove[];
  keyMoments: ReviewedMove[];
  evals: PlyEval[];
}

export function classifyBaseQuality(loss: number, playedBest: boolean): MoveQualityId {
  if (playedBest || loss <= 1.0) return "best";
  if (loss <= 2.5) return "excellent";
  if (loss <= 5.0) return "good";
  if (loss <= 10.0) return "inaccuracy";
  if (loss <= 20.0) return "mistake";
  return "blunder";
}

export function gamePhaseOf(ply: number, fen: string): "opening" | "middlegame" | "endgame" {
  const chess = new Chess(fen);
  let mat = 0;
  for (const row of chess.board()) {
    for (const sq of row) {
      if (!sq) continue;
      if (sq.type === "q") mat += 9;
      else if (sq.type === "r") mat += 5;
      else if (sq.type === "b" || sq.type === "n") mat += 3;
    }
  }
  if (mat <= 26) return "endgame";
  if (ply <= 20) return "opening";
  return "middlegame";
}

export function buildGameReview(
  startFen: string,
  uciMoves: string[],
  evals: PlyEval[],
  bookPlies = 0,
  playerSide: "w" | "b" = "w"
): GameReviewReport {
  const byPly = new Map(evals.map(e => [e.ply, e]));
  const chess = new Chess(startFen);
  const reviewed: ReviewedMove[] = [];
  const whiteWins: number[] = [];

  const e0 = byPly.get(0);
  if (e0) whiteWins.push(lichessWinPercent(e0.centipawns, e0.mate));

  for (let i = 0; i < uciMoves.length; i++) {
    const before = byPly.get(i);
    const after = byPly.get(i + 1);
    const fenBefore = chess.fen();
    const mover = chess.turn();
    const legal = chess.moves({ verbose: true });
    const parsed = parseUci(uciMoves[i]);
    const match = parsed
      ? legal.find(m => m.from === parsed.from && m.to === parsed.to && (!parsed.promotion || m.promotion === parsed.promotion))
      : undefined;
    if (!match) break;

    const played = chess.move(match);
    if (!before || !after) break;

    const whiteWinBefore = winProbabilityFromScore(before.centipawns, before.mate);
    const whiteWinAfter = winProbabilityFromScore(after.centipawns, after.mate);
    whiteWins.push(lichessWinPercent(after.centipawns, after.mate));

    const winBefore = mover === "w" ? whiteWinBefore : 100 - whiteWinBefore;
    const winAfter = mover === "w" ? whiteWinAfter : 100 - whiteWinAfter;
    const loss = Math.max(0, winBefore - winAfter);

    const bestParsed = parseUci(before.bestMove);
    const bestMatch = bestParsed
      ? legal.find(m => m.from === bestParsed.from && m.to === bestParsed.to && (!bestParsed.promotion || m.promotion === bestParsed.promotion))
      : undefined;

    const base = classifyBaseQuality(loss, before.bestMove === uciMoves[i]);
    let quality: MoveQualityId = base;

    const secondWinWhite =
      before.secondCentipawns != null || before.secondMate != null
        ? winProbabilityFromScore(before.secondCentipawns ?? null, before.secondMate ?? null)
        : null;
    const secondWinMover = secondWinWhite === null ? null : mover === "w" ? secondWinWhite : 100 - secondWinWhite;

    const oppPrev = reviewed[reviewed.length - 1];
    const isRecapture = Boolean(
      i > 0 && uciMoves[i - 1]?.slice(2, 4) === uciMoves[i].slice(2, 4) && match.captured
    );

    if (i < bookPlies) {
      quality = "book";
    } else if (legal.length === 1) {
      quality = "forced";
    } else if (
      base === "best" &&
      secondWinMover !== null &&
      winBefore - secondWinMover >= 15 &&
      winAfter >= 30 &&
      !isRecapture
    ) {
      quality = "great";
    } else if (
      (base === "inaccuracy" || base === "mistake" || base === "blunder") &&
      oppPrev &&
      (oppPrev.quality === "mistake" || oppPrev.quality === "blunder") &&
      winAfter >= (100 - oppPrev.winBefore) - 5
    ) {
      quality = "miss";
    }

    const lBefore = lichessWinPercent(before.centipawns, before.mate);
    const lAfter = lichessWinPercent(after.centipawns, after.mate);
    const moveAcc = lichessMoveAccuracy(mover === "w" ? lBefore : 100 - lBefore, mover === "w" ? lAfter : 100 - lAfter);

    reviewed.push({
      ply: i + 1,
      uci: uciMoves[i],
      san: played.san,
      mover,
      fenBefore,
      bestMove: before.bestMove,
      bestSan: bestMatch?.san ?? before.bestMove,
      line: before.line,
      winBefore,
      winAfter,
      loss,
      accuracy: moveAcc,
      quality,
      phase: gamePhaseOf(i + 1, fenBefore),
      centipawnsAfter: after.centipawns,
      mateAfter: after.mate
    });
  }

  const acc = lichessGameAccuracy(whiteWins);
  const emptyCounts = (): Record<MoveQualityId, number> => ({
    book: 0,
    forced: 0,
    brilliant: 0,
    great: 0,
    best: 0,
    excellent: 0,
    good: 0,
    inaccuracy: 0,
    miss: 0,
    mistake: 0,
    blunder: 0
  });
  const whiteCounts = emptyCounts();
  const blackCounts = emptyCounts();
  for (const m of reviewed) {
    if (m.mover === "w") whiteCounts[m.quality]++;
    else blackCounts[m.quality]++;
  }

  const keyMoments = reviewed
    .filter(m => m.mover === playerSide && (m.quality === "miss" || m.quality === "mistake" || m.quality === "blunder"))
    .sort((a, b) => b.loss - a.loss)
    .slice(0, 4)
    .sort((a, b) => a.ply - b.ply);

  return {
    whiteAccuracy: acc.white,
    blackAccuracy: acc.black,
    whiteCounts,
    blackCounts,
    moves: reviewed,
    keyMoments,
    evals
  };
}

/* ==========================================================================
   Achievements / Badges (all 16 from Achievements.kt)
   ========================================================================== */

export type BadgeKind = "games" | "puzzles" | "learning" | "review";
export type BadgeTier = "bronze" | "silver" | "gold";

export interface Badge {
  id: string;
  title: string;
  detail: string;
  kind: BadgeKind;
  progress: number;
  goal: number;
  tier: BadgeTier;
  earned: boolean;
  medalArt: string;
}

function medalArtPath(kind: BadgeKind, tier: BadgeTier): string {
  const shape = kind === "games" ? "cup" : kind === "puzzles" ? "puzzle" : kind === "learning" ? "cap" : "chart";
  return `/assets/art/medal_${shape}_${tier}.webp`;
}

function longestRun(bools: boolean[]): number {
  let best = 0;
  let run = 0;
  for (const v of bools) {
    if (v) {
      run++;
      if (run > best) best = run;
    } else {
      run = 0;
    }
  }
  return best;
}

function longestDayRun(timestamps: number[]): number {
  const days = Array.from(
    new Set(
      timestamps.map(ts => {
        const d = new Date(ts);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      })
    )
  ).sort();
  let best = 0;
  let run = 0;
  let prevDayMs: number | null = null;
  for (const dayStr of days) {
    const ms = Date.parse(dayStr + "T00:00:00Z");
    if (prevDayMs !== null && ms - prevDayMs === 86400000) run++;
    else run = 1;
    if (run > best) best = run;
    prevDayMs = ms;
  }
  return best;
}

export function computeBadges(args: {
  localGames: TutorGameRecord[];
  importedGames: StoredAccountGame[];
  analysedMap: Record<string, GameReviewReport>;
  puzzleHistory: PuzzleHistoryEntry[];
  playerLevel: number;
  lessonsDone: number;
  lessonsTotal: number;
}): Badge[] {
  const botGames = args.localGames.filter(g => (g.source ?? "arena") === "arena");
  const botWins = botGames.filter(g => g.result === "W");
  const solved = args.puzzleHistory.filter(p => p.solved).length;
  const cleanRun = longestRun(args.puzzleHistory.map(p => p.clean));
  const dayRun = longestDayRun(args.puzzleHistory.filter(p => p.solved).map(p => p.finishedAt));

  const allGames = [...args.localGames, ...args.importedGames];
  let bestAcc = 0;
  let hasBrilliant = false;
  for (const g of allGames) {
    const id = g.id ?? "";
    const rep = args.analysedMap[id];
    if (!rep) continue;
    const side = (g.playerColor ?? "w") === "w" ? "w" : "b";
    const acc = side === "w" ? rep.whiteAccuracy : rep.blackAccuracy;
    if (acc && acc > bestAcc) bestAcc = acc;
    if (rep.moves.some(m => m.mover === side && m.quality === "brilliant")) hasBrilliant = true;
  }

  const beat = (minRating: number) => (botWins.some(g => g.rating >= minRating) ? 1 : 0);
  const mk = (id: string, title: string, detail: string, kind: BadgeKind, progress: number, goal: number, tier: BadgeTier = "bronze"): Badge => ({
    id,
    title,
    detail,
    kind,
    progress: Math.min(progress, goal),
    goal,
    tier,
    earned: progress >= goal,
    medalArt: medalArtPath(kind, tier)
  });

  const list = [
    mk("first-win", "First win", "Beat a bot", "games", botWins.length, 1, "bronze"),
    mk("giant-slayer", "Giant slayer", "Beat a bot rated 1600 or more", "games", beat(1600), 1, "silver"),
    mk("bot-master", "Bot master", "Beat a bot rated 2000 or more", "games", beat(2000), 1, "gold"),
    mk("regular", "Regular", "Play 25 games against bots", "games", botGames.length, 25, "bronze"),
    mk("puzzles-10", "Puzzle starter", "Solve 10 puzzles", "puzzles", solved, 10, "bronze"),
    mk("puzzles-100", "Puzzle fan", "Solve 100 puzzles", "puzzles", solved, 100, "silver"),
    mk("puzzles-500", "Puzzle master", "Solve 500 puzzles", "puzzles", solved, 500, "gold"),
    mk("hot-hand", "Hot hand", "Solve 10 puzzles cleanly in a row", "puzzles", cleanRun, 10, "silver"),
    mk("week", "Seven days", "Solve a puzzle 7 days in a row", "puzzles", dayRun, 7, "silver"),
    mk("level-10", "Level 10", "Reach level 10", "puzzles", args.playerLevel, 10, "silver"),
    mk("first-lesson", "First lesson", "Finish a lesson", "learning", args.lessonsDone, 1, "bronze"),
    mk("ten-lessons", "Keen learner", "Finish 10 lessons", "learning", args.lessonsDone, 10, "silver"),
    mk("all-lessons", "Graduate", "Finish every lesson", "learning", args.lessonsDone, Math.max(1, args.lessonsTotal), "gold"),
    mk("first-review", "Under the microscope", "Review a game with Stockfish", "review", Object.keys(args.analysedMap).length, 1, "bronze"),
    mk("sharp", "Sharp", "Play a game with 90% accuracy or more", "review", bestAcc >= 90 ? 1 : 0, 1, "silver"),
    mk("brilliant", "Brilliant!", "Play a brilliant move in a reviewed game", "review", hasBrilliant ? 1 : 0, 1, "gold")
  ];

  return list.sort((a, b) => Number(b.earned) - Number(a.earned) || b.progress / b.goal - a.progress / a.goal);
}

/* ==========================================================================
   Training Calculator & Next Step Recommender
   ========================================================================== */

export interface ThemeScore {
  theme: string;
  name: string;
  attempts: number;
  clean: number;
  rate: number;
}

export interface TrainingReport {
  ratingHistory: { dateMillis: number; rating: number }[];
  puzzlesPlayed: number;
  cleanSolves: number;
  cleanRate: number;
  strengths: ThemeScore[];
  weaknesses: ThemeScore[];
  lessonsDone: number;
  lessonsTotal: number;
}

export function buildTrainingReport(
  history: PuzzleHistoryEntry[],
  themesLookup: (puzzleId: string) => string[],
  lessonsDone: number,
  lessonsTotal: number
): TrainingReport {
  const attempts = new Map<string, number>();
  const clean = new Map<string, number>();
  for (const h of history) {
    const tags = themesLookup(h.puzzleId).filter(isKnownTheme);
    for (const tag of tags) {
      attempts.set(tag, (attempts.get(tag) ?? 0) + 1);
      if (h.clean) clean.set(tag, (clean.get(tag) ?? 0) + 1);
    }
  }
  const scores: ThemeScore[] = [];
  for (const [theme, n] of attempts.entries()) {
    if (n < 3) continue;
    const c = clean.get(theme) ?? 0;
    scores.push({ theme, name: displayThemeName(theme), attempts: n, clean: c, rate: c / n });
  }
  const strengths = scores
    .filter(s => s.rate >= 0.5)
    .sort((a, b) => b.rate - a.rate || b.attempts - a.attempts || a.theme.localeCompare(b.theme))
    .slice(0, 3);
  const strengthSet = new Set(strengths.map(s => s.theme));
  const weaknesses = scores
    .filter(s => s.rate < 0.75 && !strengthSet.has(s.theme))
    .sort((a, b) => a.rate - b.rate || b.attempts - a.attempts || a.theme.localeCompare(b.theme))
    .slice(0, 3);

  const cleanSolves = history.filter(h => h.clean).length;
  return {
    ratingHistory: history.map(h => ({ dateMillis: h.finishedAt, rating: h.ratingAfter })),
    puzzlesPlayed: history.length,
    cleanSolves,
    cleanRate: history.length ? cleanSolves / history.length : 0,
    strengths,
    weaknesses,
    lessonsDone,
    lessonsTotal
  };
}
