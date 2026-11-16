import test from "node:test";
import assert from "node:assert/strict";
import { LearnRun, RepertoireIndex, buildReviewQueue, cardsOf } from "../src/domain/repertoire.ts";
import { freeName, lineBook, sanLine } from "../src/domain/myLines.ts";

const london = { id: "1", name: "London", side: "w" as const, moves: ["d2d4", "d7d5", "c1f4", "g8f6", "e2e3", "e7e6", "g1f3"] };

test("names stay unique and the line reads as SAN", () => {
  assert.equal(freeName("London", ["London", "London 2"]), "London 3");
  assert.equal(freeName("  ", []), "My line");
  assert.equal(sanLine(london.moves), "1.d4 d5 2.Bf4 Nf6 3.e3 e6 4.Nf3");
});

test("a line drills like a book: its own moves are cards, learnt in one run, then reviewed", () => {
  const book = lineBook(london);
  assert.equal(cardsOf(book).length, 4);
  const index = new RepertoireIndex(book);
  assert.equal(index.size, book.nodes.size);
  const own = cardsOf(book).map(n => n.key);
  const run = new LearnRun(index, { moves: london.moves, newCards: own, name: "London" }, () => 0);
  run.skipWatch();
  let guard = 0;
  while (run.pass === "recall" && guard++ < 50) {
    if (run.isOwnTurn) assert.equal(run.submit(run.segment.moves[run.ply]), "right");
    else assert.ok(run.playOpponent());
  }
  assert.equal(run.pass, "done");
  assert.equal(run.outcome.length, 4);
  const states = run.outcome.map(o => ({ ...o[0], dueAt: 0 }));
  assert.equal(buildReviewQueue([index], states, 1).length, 4);
});

test("a line for Black starts with White's reply", () => {
  const book = lineBook({ id: "2", name: "Caro", side: "b", moves: ["e2e4", "c7c6", "d2d4", "d7d5"] });
  assert.equal(cardsOf(book).length, 2);
});
