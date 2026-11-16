import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Chess } from "chess.js";
import { parseRepertoire } from "../src/domain/repertoire.ts";
import { FindingGame, endingKindOf, endingResults, findingGameOf, gameFindings, lineSlips, materialLead, repeatedMistakes } from "../src/domain/gameFindings.ts";

const italian = parseRepertoire(JSON.parse(readFileSync("public/data/repertoire/italian.json", "utf8")));
const game = (id: string, moves: string[], outcome: FindingGame["outcome"] = "loss", userColor: "w" | "b" = "w"): FindingGame => ({ id, userColor, outcome, moves, opening: "Italian Game" });

test("line slip: leaving the Italian the same way twice is found, with the repertoire move", () => {
  // The repertoire plays 3.Bc4; these games played 3.Bb5 instead.
  const games = [game("a", ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5"]), game("b", ["e2e4", "e7e5", "g1f3", "b8c6", "f1b5", "a7a6"]), game("c", ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4"])];
  const slips = lineSlips(games, [italian]);
  // 3.Bc4 is a defining move, not a card, so no slip there: the first card is deeper.
  assert.equal(slips.length, 0);
  const deeper = [
    game("d", ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5", "a2a3"]),
    game("e", ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5", "a2a3", "g8f6"]),
    game("f", ["e2e4", "e7e5", "g1f3", "b8c6", "f1c4", "f8c5", "a2a3"], "win")
  ];
  const found = lineSlips(deeper, [italian]);
  assert.equal(found.length, 1);
  assert.equal(found[0].played, "4.a3");
  assert.equal(found[0].misses, 3);
  assert.equal(found[0].after, "3...Bc5");
  assert.ok(found[0].right.startsWith("4."));
  assert.ok(found[0].path.length >= 6);
});

test("endings: kinds and lead, and a result needs three games", () => {
  assert.equal(endingKindOf(new Chess("8/5pk1/6p1/3R4/8/6P1/r4PK1/8 w - - 0 40").board()), "rook");
  assert.equal(endingKindOf(new Chess("4k3/8/4K3/4P3/8/8/8/8 w - - 0 1").board()), "pawn");
  assert.equal(endingKindOf(new Chess().board()), null);
  assert.equal(materialLead(new Chess("4k3/8/4K3/4P3/8/8/8/8 w - - 0 1").board(), "w"), 1);
  // A game that trades down into a king and pawn ending a pawn up (from the start, so use moves).
  assert.deepEqual(endingResults([game("x", ["e2e4"])]), []);
});

test("repeated mistakes need the same move in the same position twice", () => {
  const fen = "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3";
  const move = { ply: 6, uci: "f8e7", san: "Be7", mover: "b" as const, fenBefore: fen, bestMove: "g8f6", bestSan: "Nf6", line: [], winBefore: 50, winAfter: 30, loss: 20, accuracy: 40, quality: "mistake" as const, phase: "opening" as const, centipawnsAfter: null, mateAfter: null };
  const report = { whiteAccuracy: null, blackAccuracy: null, whiteCounts: {} as any, blackCounts: {} as any, moves: [move], keyMoments: [], evals: [] };
  const games = [game("g1", [], "loss", "b"), game("g2", [], "loss", "b")];
  const found = repeatedMistakes(games, { g1: report, g2: report });
  assert.equal(found.length, 1);
  assert.equal(found[0].played, "3...Be7");
  assert.equal(found[0].better, "3...Nf6");
  assert.equal(found[0].times, 2);
  assert.equal(repeatedMistakes(games.slice(0, 1), { g1: report }).length, 0);
  assert.ok(gameFindings(games, [italian], { g1: report, g2: report }).length >= 1);
});

test("saved games convert from PGN; games from a set-up position are skipped", () => {
  const g = findingGameOf({ id: "1", pgn: "1. e4 e5 2. Nf3 Nc6 *", result: "W", playerColor: "w", opening: "x" });
  assert.deepEqual(g?.moves, ["e2e4", "e7e5", "g1f3", "b8c6"]);
  assert.equal(g?.outcome, "win");
  assert.equal(findingGameOf({ id: "2", pgn: '[SetUp "1"]\n[FEN "8/8/8/8/8/8/8/K6k w - - 0 1"]\n1. Kb1 *', result: "D" }), null);
});

test("endings: games that never reach an ending count for nothing", () => {
  const line = ["e2e4", "d7d5", "e4d5", "d8d5", "d1g4", "c8g4"]; // not an ending: nothing counted
  assert.deepEqual(endingResults([game("1", line, "win"), game("2", line, "win"), game("3", line, "win")]), []);
});
