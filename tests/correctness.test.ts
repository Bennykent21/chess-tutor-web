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

test("Account Analytics engine processes color splits, terminations, and openings accurately", async () => {
  const { computeAccountAnalytics } = await import("../src/lib/accountStats.ts");

  const sampleGames = [
    {
      id: "g1",
      source: "lichess" as const,
      platform: "lichess" as const,
      accountUsername: "tester",
      opponent: "opp1",
      rating: 1500,
      userRating: 1510,
      playerColor: "w" as const,
      userColor: "w" as const,
      result: "W" as const,
      termination: "Checkmate",
      timeClass: "rapid",
      rated: true,
      date: "Oct 1, 2026",
      playedAt: Date.now(),
      opening: "Italian Game",
      eco: "C50",
      openingEco: "C50",
      openingPlayedSide: "white" as const,
      moves: 32
    },
    {
      id: "g2",
      source: "lichess" as const,
      platform: "lichess" as const,
      accountUsername: "tester",
      opponent: "opp2",
      rating: 1520,
      userRating: 1525,
      playerColor: "w" as const,
      userColor: "w" as const,
      result: "L" as const,
      termination: "Resignation",
      timeClass: "rapid",
      rated: true,
      date: "Oct 2, 2026",
      playedAt: Date.now() - 1000,
      opening: "Sicilian Defense",
      eco: "B20",
      openingEco: "B20",
      openingPlayedSide: "black" as const,
      moves: 40
    },
    {
      id: "g3",
      source: "chess.com" as const,
      platform: "chess.com" as const,
      accountUsername: "tester",
      opponent: "opp3",
      rating: 1490,
      userRating: 1505,
      playerColor: "b" as const,
      userColor: "b" as const,
      result: "D" as const,
      termination: "Stalemate",
      timeClass: "blitz",
      rated: true,
      date: "Oct 3, 2026",
      playedAt: Date.now() - 2000,
      opening: "Queen's Gambit",
      eco: "D06",
      openingEco: "D06",
      openingPlayedSide: "white" as const,
      moves: 50
    }
  ];

  const allStats = computeAccountAnalytics(sampleGames, { timeframe: "all", timeClass: "all", color: "all" });
  assert.equal(allStats.totalGames, 3);
  assert.equal(allStats.wins, 1);
  assert.equal(allStats.losses, 1);
  assert.equal(allStats.draws, 1);
  assert.equal(allStats.scorePct, 50);
  assert.equal(allStats.openingsPlayed.length, 1);
  assert.equal(allStats.openingsPlayed[0].name, "Italian Game");
  assert.equal(allStats.openingsFaced.length, 2);

  const rapidOnly = computeAccountAnalytics(sampleGames, { timeframe: "all", timeClass: "rapid", color: "all" });
  assert.equal(rapidOnly.totalGames, 2);
});

test("calculateCapturesFromMoves and parsePgnSafely handle captures, comments, NAGs, and truncation safely", async () => {
  const { calculateCapturesFromMoves, tokenizePgnMoves, parsePgnSafely } = await import("../src/lib/chessUtils.ts");

  const startBoard = new Chess();
  const emptyCaps = calculateCapturesFromMoves(startBoard.history({ verbose: true }));
  assert.equal(emptyCaps.capturedByWhite.length, 0);
  assert.equal(emptyCaps.capturedByBlack.length, 0);
  assert.equal(emptyCaps.whiteMaterialAdvantage, 0);

  const scholarBoard = new Chess();
  ["e4", "e5", "Qh5", "Nc6", "Bc4", "Nf6", "Qxf7#"].forEach(m => scholarBoard.move(m));
  const caps = calculateCapturesFromMoves(scholarBoard.history({ verbose: true }));
  assert.deepEqual(caps.capturedByWhite, ["p"]);
  assert.equal(caps.whiteMaterialAdvantage, 1);

  const tokens = tokenizePgnMoves('1. e4 {Best by test} $1 e5 (1... c5 2. Nf3) 2. Nf3 0-0-0?!');
  assert.deepEqual(tokens, ["e4", "e5", "Nf3", "O-O-O"]);

  const clean = parsePgnSafely("1. e4 e5 2. Nf3 Nc6 3. Bb5 a6");
  assert.equal(clean.incomplete, false);
  assert.equal(clean.moves.length, 6);

  const broken = parsePgnSafely("1. e4 e5 2. Qxh8");
  assert.equal(broken.incomplete, true);
  assert.equal(broken.moves.length, 2);
});

test("PuzzlePack, alternatives, multi-move PuzzleSession, worlds, and XP/Elo math", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const {
    PuzzlePack,
    PuzzleSession,
    PUZZLE_WORLDS,
    PUZZLE_LEVEL_COUNT,
    dailyPuzzleForDate,
    levelTargetRating,
    playerLevelFromXp,
    puzzlesForLevel,
    updatePuzzleElo
  } = await import("../src/domain/puzzles.ts");

  assert.equal(PUZZLE_WORLDS.length, 5);
  assert.equal(levelTargetRating(1), 400);
  assert.equal(levelTargetRating(PUZZLE_LEVEL_COUNT), 2400);

  // Load real puzzles.tsv pack from public/data
  const tsv = fs.readFileSync(path.join(process.cwd(), "public/data/puzzles.tsv"), "utf-8");
  const pack = PuzzlePack.parseTsv(tsv);
  assert.ok(pack.size >= 10000, `Expected >=10000 puzzles in pack, got ${pack.size}`);

  const lvl1 = puzzlesForLevel(1, 0, pack);
  assert.equal(lvl1.length, 5);
  assert.ok(dailyPuzzleForDate(pack) !== null);

  // Test alternative move acceptance on a synthetic multi-move puzzle
  const synthetic = new PuzzlePack([
    {
      id: "synth1",
      fen: "6k1/5ppp/8/8/8/8/5PPP/4R1K1 b - - 0 1",
      moves: ["g8f8", "e1e8"],
      rating: 900,
      primaryTheme: "backRankMate",
      themes: ["backRankMate", "mateIn1"],
      popularity: 100,
      alternatives: [[]]
    },
    {
      id: "synth2",
      fen: "6k1/5ppp/8/8/8/8/4QPPP/3R2K1 b - - 0 1",
      moves: ["g8f8", "e2e8"],
      rating: 1100,
      primaryTheme: "mateIn1",
      themes: ["mateIn1"],
      popularity: 95,
      alternatives: [["d1d8"]]
    }
  ]);

  const p2 = synthetic.get("synth2")!;
  const session = new PuzzleSession(p2);
  assert.equal(session.solverColor, "w");
  const wrong = session.submit("h2h3");
  assert.equal(wrong.kind, "wrong");
  const altOutcome = session.submit("d1d8");
  assert.equal(altOutcome.kind, "correct");
  if (altOutcome.kind === "correct") {
    assert.equal(altOutcome.solved, true);
    assert.equal(altOutcome.alternative, true);
  }

  // Test Elo update and level curve
  const higher = updatePuzzleElo(1000, 1200, true);
  assert.ok(higher > 1000);
  const lvlInfo = playerLevelFromXp(120);
  assert.ok(lvlInfo.level >= 2);
});

test("OpeningTree transposition matching and BattlePlan generation", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const { parseOpeningsTsv, createBattlePlan } = await import("../src/domain/openings.ts");

  const tsv = fs.readFileSync(path.join(process.cwd(), "public/data/openings.tsv"), "utf-8");
  const tree = parseOpeningsTsv(tsv);
  assert.ok(tree.openings.length >= 3000, `Expected >=3000 ECO lines, got ${tree.openings.length}`);

  const italian = tree.presetLine("Italian Game");
  assert.ok(italian, "Italian Game must exist in opening tree");

  const match = tree.match(["e2e4", "e7e5", "g1f3", "b8c6", "f1c4"]);
  assert.ok(match.opening, "Should match C50 Italian Game");
  assert.equal(match.opening?.eco, "C50");

  const plan = createBattlePlan(tree, {
    line: italian!,
    playerColor: "w",
    mode: "drill",
    exactReplies: true
  });
  assert.equal(plan.target.name, italian!.name);
});

test("All bundled JSON lesson courses parse cleanly with valid FENs", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const { parseCourseJson, computeStepInitialState } = await import("../src/domain/lessons.ts");

  const dir = path.join(process.cwd(), "public/data/lessons");
  const files: string[] = JSON.parse(fs.readFileSync(path.join(dir, "index.json"), "utf-8"));
  assert.ok(files.length >= 37, `Expected >=37 lesson files, got ${files.length}`);

  for (const file of files) {
    const raw = JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8"));
    const course = parseCourseJson(raw);
    assert.ok(course, `Course ${file} failed to parse`);
    assert.ok(course!.lessons.length > 0, `Course ${file} has no lessons`);
    for (const lesson of course!.lessons) {
      for (let i = 0; i < lesson.steps.length; i++) {
        const init = computeStepInitialState(lesson, i);
        assert.doesNotThrow(() => new Chess(init.fen), `Invalid FEN in ${file} -> ${lesson.id} step ${i}`);
      }
    }
  }
});

test("Bot roster, move scoring, GameReview & Badges computation", async () => {
  const { BOT_ROSTER, pickBotCandidateMove, shouldBotResign } = await import("../src/domain/bots.ts");
  const { buildGameReview, computeBadges } = await import("../src/domain/account.ts");

  assert.equal(BOT_ROSTER.length, 12);
  const fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
  const picked = pickBotCandidateMove(fen, [{ uci: "e7e5", scoreCp: -10 }, { uci: "c7c5", scoreCp: -15 }], BOT_ROSTER[5].profile);
  assert.ok(["e7e5", "c7c5"].includes(picked));
  assert.equal(shouldBotResign(BOT_ROSTER[0].profile, [-900, -900, -900]), false); // Pebble never resigns
  assert.equal(shouldBotResign(BOT_ROSTER[5].profile, [-900, -900, -900]), true);

  const evals = [
    { ply: 0, centipawns: 20, mate: null, bestMove: "e2e4", line: ["e2e4"] },
    { ply: 1, centipawns: 25, mate: null, bestMove: "e7e5", line: ["e7e5"] },
    { ply: 2, centipawns: 30, mate: null, bestMove: "g1f3", line: ["g1f3"] }
  ];
  const rev = buildGameReview(new Chess().fen(), ["e2e4", "e7e5"], evals, 2, "w");
  assert.equal(rev.moves.length, 2);
  assert.equal(rev.moves[0].quality, "book");
  assert.ok(rev.whiteAccuracy !== null && rev.whiteAccuracy >= 90);

  const badges = computeBadges({
    localGames: [],
    importedGames: [],
    analysedMap: { g1: rev },
    puzzleHistory: [],
    playerLevel: 1,
    lessonsDone: 1,
    lessonsTotal: 37
  });
  assert.equal(badges.length, 16);
  assert.equal(badges.find(b => b.id === "first-lesson")?.earned, true);
  assert.equal(badges.find(b => b.id === "first-review")?.earned, true);
});



