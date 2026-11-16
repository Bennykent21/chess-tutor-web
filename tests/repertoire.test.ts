import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  LearnRun,
  RepertoireIndex,
  ReviewSession,
  afterRecall,
  buildReviewQueue,
  cardId,
  cardsOf,
  introduceCard,
  isTricky,
  masteryOf,
  parseRepertoire,
  planLearn,
  readiness,
  variationsOf,
  CardState
} from "../src/domain/repertoire.ts";

const load = (id: string) => parseRepertoire(JSON.parse(readFileSync(`public/data/repertoire/${id}.json`, "utf8")));
const books = ["italian", "caro-kann"].map(load);
const DAY = 86_400_000;

for (const book of books) {
  test(`${book.id}: every node is reached from the start with matching keys`, () => {
    const index = new RepertoireIndex(book);
    assert.equal(index.size, book.nodes.size);
    assert.ok(cardsOf(book).length > 20);
  });

  test(`${book.id}: a learn run introduces its new cards, all right first time`, () => {
    const index = new RepertoireIndex(book);
    const segment = planLearn(index, 0, new Set())!;
    assert.ok(segment && segment.newCards.length > 0 && segment.newCards.length <= 8);
    let t = 1_000;
    const run = new LearnRun(index, segment, () => t);
    while (run.pass === "watch") assert.ok(run.watchNext());
    assert.equal(run.pass, "recall");
    let guard = 0;
    while (run.pass === "recall" && guard++ < 100) {
      if (run.isOwnTurn) assert.equal(run.submit(run.segment.moves[run.ply]), "right");
      else assert.ok(run.playOpponent());
    }
    assert.equal(run.pass, "done");
    const out = run.outcome;
    assert.deepEqual(out.map(o => o[0].key).sort(), [...segment.newCards].sort());
    assert.ok(out.every(([s, r]) => s.stage === 0 && r.firstTryRight));
    // The next segment starts somewhere new.
    const next = planLearn(index, 0, new Set(segment.newCards));
    assert.ok(next && next.newCards.every(k => !segment.newCards.includes(k)));
  });

  test(`${book.id}: variations split the first branch and count cards`, () => {
    const index = new RepertoireIndex(book);
    const rows = variationsOf(index, null, 2, {});
    assert.ok(rows.length >= 2, `${rows.length} variations`);
    assert.ok(rows.every(r => r.cards > 0));
  });
}

test("schedule: right moves out, wrong comes back now, lapses make a card tricky", () => {
  const book = books[0];
  const node = cardsOf(book)[0];
  let card: CardState = introduceCard(book.id, node, 0);
  [card] = afterRecall(card, true, false, 0);
  assert.equal(card.stage, 0);
  assert.equal(card.dueAt, DAY);
  [card] = afterRecall(card, true, false, DAY);
  assert.equal(card.stage, 1);
  assert.equal(card.dueAt, DAY + 3 * DAY);
  [card] = afterRecall(card, false, false, 5 * DAY);
  assert.equal(card.stage, -1);
  assert.equal(card.lapses, 1);
  [card] = afterRecall(card, false, false, 5 * DAY);
  assert.ok(isTricky(card));
  [card] = afterRecall(card, true, false, 6 * DAY);
  assert.ok(card.dueAt <= 6 * DAY + 3 * DAY);
});

test("review session: due cards from both books, mixed, scored on the first try", () => {
  const indexes = books.map(b => new RepertoireIndex(b));
  const states: CardState[] = [];
  for (const b of books) for (const n of cardsOf(b, 0).slice(0, 3)) states.push(introduceCard(b.id, n, 0));
  const queue = buildReviewQueue(indexes, states, 10);
  assert.equal(queue.length, 6);
  for (let i = 1; i < queue.length; i++) assert.notEqual(queue[i].index.book.id, queue[i - 1].index.book.id);
  const session = new ReviewSession(queue, () => 10);
  // First card wrong, the rest right.
  const first = session.current!;
  const wrong = first.node.also.length ? null : "a2a3";
  if (wrong && session.submit(wrong) === "wrong") {
    session.submit(first.node.move!);
  } else {
    session.showAnswer();
  }
  session.next();
  while (!session.finished) {
    assert.equal(session.submit(session.current!.node.move!), "right");
    session.next();
  }
  assert.equal(session.outcome.length, 6);
  assert.equal(session.rightFirstTime, 5);
});

test("mastery needs every card, settled, accurate, over three days", () => {
  const book = books[1];
  const states: Record<string, CardState> = {};
  assert.equal(masteryOf(book, 0, states, []).mastered, false);
  assert.equal(readiness(book, 0, states), 0);
  for (const n of cardsOf(book, 0)) states[cardId(book.id, n.key)] = { ...introduceCard(book.id, n, 0), stage: 2 };
  assert.equal(readiness(book, 0, states), 1);
  const reviews = Object.keys(states).map((id, i) => ({ cardId: id, bookId: book.id, level: 0 as const, at: (i % 3) * DAY, firstTryRight: true, hinted: false }));
  assert.equal(masteryOf(book, 0, states, reviews).mastered, true);
});
