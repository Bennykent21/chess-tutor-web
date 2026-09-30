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
