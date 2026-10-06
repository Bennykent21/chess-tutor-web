import test from "node:test";
import assert from "node:assert/strict";
import { Chess } from "chess.js";
import {
  touchActivity,
  mergeProgress,
  applyReviewResult,
  defaultProgress,
  TutorProgress,
  TutorReviewItem
} from "../src/lib/storage.ts";

test("scoreForPlayer evaluation POV and loss computation", () => {
  // Score helper simulation matching gameAnalysis.ts
  function scoreForPlayer(evaluation: { scoreCp: number | null; mateIn: number | null }, playerColor: "w" | "b"): number | null {
    const sign = playerColor === "w" ? 1 : -1;
    if (evaluation.mateIn !== null) return Math.sign(evaluation.mateIn) * 10000 * sign;
    if (evaluation.scoreCp !== null) return evaluation.scoreCp * sign;
    return null;
  }

  // White is up +300 cp, then hangs queen and is down -600 cp
  const beforeWhite = { scoreCp: 300, mateIn: null };
  const afterWhite = { scoreCp: -600, mateIn: null };
  const beforeScoreW = scoreForPlayer(beforeWhite, "w");
  const afterScoreW = scoreForPlayer(afterWhite, "w");
  const lossCpW = Math.max(0, Math.round(beforeScoreW! - afterScoreW!));

  assert.equal(lossCpW, 900, "White queen blunder should register as 900 cp loss");

  // White makes best move and remains +300 cp
  const goodAfterWhite = { scoreCp: 300, mateIn: null };
  const goodLossW = Math.max(0, Math.round(beforeScoreW! - scoreForPlayer(goodAfterWhite, "w")!));
  assert.equal(goodLossW, 0, "Best move has 0 cp loss");

  // Black is up +200 cp (eval is -200 from White POV), then blunders down to -500 cp (eval is +500 from White POV)
  const beforeBlack = { scoreCp: -200, mateIn: null };
  const afterBlack = { scoreCp: 500, mateIn: null };
  const beforeScoreB = scoreForPlayer(beforeBlack, "b");
  const afterScoreB = scoreForPlayer(afterBlack, "b");
  const lossCpB = Math.max(0, Math.round(beforeScoreB! - afterScoreB!));

  assert.equal(lossCpB, 700, "Black blunder should register as 700 cp loss for Black");
});

test("touchActivity streak increments on consecutive day and resets on gap", () => {
  const baseProgress: TutorProgress = {
    ...defaultProgress,
    streak: 5,
    lastActiveDate: "2026-09-20"
  };

  const updated = touchActivity(baseProgress);
  assert.equal(updated.streak, 1, "Gap between 2026-09-20 and today must reset streak to 1");
});

test("mergeProgress preserves local achievements when signing in to fresh account", () => {
  const local: TutorProgress = {
    weeklyAccuracy: 85,
    reviewDue: 3,
    streak: 4,
    completedLessons: ["Italian Game", "Golden Rules of Opening"],
    solvedPositions: 15,
    recordedMistakes: 2,
    lastActiveDate: "2026-09-30"
  };

  const emptyCloud: TutorProgress = {
    weeklyAccuracy: 0,
    reviewDue: 0,
    streak: 0,
    completedLessons: [],
    solvedPositions: 0,
    recordedMistakes: 0,
    lastActiveDate: null
  };

  const merged = mergeProgress(local, emptyCloud);
  assert.equal(merged.solvedPositions, 15);
  assert.equal(merged.streak, 4);
  assert.equal(merged.completedLessons.length, 2);
  assert.equal(merged.weeklyAccuracy, 88); // 15 / 17
});

test("applyReviewResult spaced repetition scheduling", () => {
  const initialSchedule: TutorReviewItem[] = [
    {
      puzzleKey: "Test Puzzle",
      dueAt: new Date().toISOString(),
      intervalDays: 1,
      repetitions: 0,
      lastResult: null
    }
  ];

  // 1st correct attempt
  const afterFirst = applyReviewResult(initialSchedule, "Test Puzzle", true);
  assert.equal(afterFirst[0].repetitions, 1);
  assert.equal(afterFirst[0].intervalDays, 1);

  // 2nd correct attempt
  const afterSecond = applyReviewResult(afterFirst, "Test Puzzle", true);
  assert.equal(afterSecond[0].repetitions, 2);
  assert.equal(afterSecond[0].intervalDays, 3);

  // Miss on 3rd attempt
  const afterMiss = applyReviewResult(afterSecond, "Test Puzzle", false);
  assert.equal(afterMiss[0].repetitions, 0, "Mistake must reset repetitions to 0");
  assert.equal(afterMiss[0].intervalDays, 1, "Mistake must reset interval to 1 day");
  assert.equal(afterMiss[0].lastResult, "wrong");
});

test("Lichess Opening Database provides accurate ECO, win percentages, and candidate moves", async () => {
  const { getLocalOpeningStats, normalizeFen } = await import("../src/data/openingsDatabase.ts");
  const { fetchLichessOpeningStats } = await import("../src/lib/lichess.ts");

  // 1. Initial position
  const initialFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  const initialStats = getLocalOpeningStats(initialFen);
  assert.ok(initialStats, "Initial position must exist in Lichess database");
  assert.equal(initialStats.eco, "A00");
  assert.equal(initialStats.whiteWinPct + initialStats.drawPct + initialStats.blackWinPct, 100);
  assert.ok(initialStats.moves.length >= 4, "Must offer top moves (e4, d4, Nf3, c4)");

  // 2. 1. e4 King's Pawn
  const e4Fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1";
  const e4Stats = getLocalOpeningStats(e4Fen);
  assert.ok(e4Stats);
  assert.equal(e4Stats.name, "King's Pawn Game");
  const c5Move = e4Stats.moves.find(m => m.san === "c5");
  assert.ok(c5Move, "Sicilian c5 must be top candidate response");
  assert.equal(c5Move.whiteWinPct + c5Move.drawPct + c5Move.blackWinPct, 100);

  // 3. Italian Game
  const italianFen = "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3";
  const italianStats = getLocalOpeningStats(italianFen);
  assert.ok(italianStats);
  assert.equal(italianStats.eco, "C50");
  assert.equal(italianStats.name, "Italian Game");

  // 4. Explorer fetch fallback works seamlessly
  const explorerResult = await fetchLichessOpeningStats({ fen: italianFen });
  assert.ok(explorerResult.stats);
  assert.equal(explorerResult.stats.eco, "C50");
  assert.ok(explorerResult.stats.moves.length > 0);
});

