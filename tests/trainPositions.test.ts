import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Chess } from "chess.js";
import { endedOutcome, learnerScore, parsePositionSets, positionQueue, scoredOutcome } from "../src/domain/trainPositions.ts";

const sets = parsePositionSets(JSON.parse(readFileSync("public/data/positions/positions.json", "utf8")));

test("positions load: endgames and middlegames, each a legal position", () => {
  assert.ok(sets.some(s => s.kind === "endgame") && sets.some(s => s.kind === "middlegame"));
  for (const s of sets) for (const p of s.positions) assert.doesNotThrow(() => new Chess(p.fen));
});

test("queue skips won and waiting positions, then replays the whole set", () => {
  const set = sets[0];
  const [a, b] = set.positions;
  const q = positionQueue(set, { [a.id]: { won: true, dueDay: null }, [b.id]: { won: false, dueDay: 11 } }, 10);
  assert.ok(!q.includes(a) && !q.includes(b));
  const all = Object.fromEntries(set.positions.map(p => [p.id, { won: true, dueDay: null }]));
  assert.equal(positionQueue(set, all, 10).length, set.positions.length);
});

test("judge: win, convert and hold bands", () => {
  assert.equal(scoredOutcome("win", { cp: 900, mate: null }, false, 3), "playing");
  assert.equal(scoredOutcome("win", { cp: 40, mate: null }, false, 3), "slipped");
  assert.equal(scoredOutcome("win", { cp: 1200, mate: null }, true, 9), "won");
  assert.equal(scoredOutcome("convert", { cp: 520, mate: null }, false, 4), "won");
  assert.equal(scoredOutcome("convert", { cp: 50, mate: null }, false, 4), "slipped");
  assert.equal(scoredOutcome("hold", { cp: -100, mate: null }, false, 15), "held");
  assert.equal(scoredOutcome("hold", { cp: 0, mate: -3 }, false, 4), "slipped");
  assert.deepEqual(learnerScore(120, null, "b"), { cp: -120, mate: null });
  const mated = new Chess("7k/6Q1/6K1/8/8/8/8/8 b - - 0 1");
  assert.equal(endedOutcome("win", mated, "w"), "won");
  const stalemate = new Chess("7k/5Q2/6K1/8/8/8/8/8 b - - 0 1");
  assert.equal(endedOutcome("win", stalemate, "w"), "slipped");
  assert.equal(endedOutcome("hold", stalemate, "b"), "held");
});
