import test from "node:test";
import assert from "node:assert/strict";
import { backRank960, castles960, gameEnd, moveText, playMove, standardStart, start960 } from "../src/domain/friendGame.ts";

test("Chess960 numbering: 518 is the normal start, and every start is legal 960", () => {
  assert.equal(backRank960(518), "RNBQKBNR");
  assert.equal(backRank960(0), "BBQNNRKR");
  for (let n = 0; n < 960; n++) {
    const r = backRank960(n);
    const b = [...r].map((p, i) => (p === "B" ? i : -1)).filter(i => i >= 0);
    assert.equal((b[0] + b[1]) % 2, 1, `bishops on opposite colours in ${n}`);
    const [r1, k, r2] = ["R", "K", "R"].map((p, i) => (i === 1 ? r.indexOf("K") : i === 0 ? r.indexOf("R") : r.lastIndexOf("R")));
    assert.ok(r1 < k && k < r2, `king between rooks in ${n}`);
  }
});

test("960 castling: king onto its rook, ending on g/c with the rook on f/d, then no more rights", () => {
  // 0 is BBQNNRKR: king g1, rooks f1 and h1. Clear the knights and queen side to allow O-O-O.
  let pos = start960(0);
  assert.deepEqual(castles960(pos), []); // nothing is clear yet... f1 rook next to king: O-O needs h1-f1 path
  // Build a position with an open back rank: only kings and rooks.
  pos = { fen: "1r4k1/8/8/8/8/8/8/1R4K1 w - - 0 1", rights: { w: { k: null, q: "b1" }, b: { k: null, q: "b8" } }, uci: null, san: null };
  const castles = castles960(pos);
  assert.equal(castles.length, 1);
  assert.equal(castles[0].uci, "g1b1");
  const after = playMove(pos, "g1b1")!;
  assert.equal(after.fen.split(" ")[0], "1r4k1/8/8/8/8/8/8/2KR4");
  assert.equal(after.san, "O-O-O");
  assert.deepEqual(after.rights!.w, { k: null, q: null });
});

test("960 castling is refused through check and when a piece is in the way", () => {
  const blocked = { fen: "4k3/8/8/8/8/8/8/1RN3K1 w - - 0 1", rights: { w: { k: null, q: "b1" }, b: { k: null, q: null } }, uci: null, san: null };
  assert.equal(castles960(blocked).length, 0);
  const attacked = { fen: "3rk3/8/8/8/8/8/8/1R4K1 w - - 0 1", rights: { w: { k: null, q: "b1" }, b: { k: null, q: null } }, uci: null, san: null };
  assert.equal(castles960(attacked).length, 0);
});

test("moving a rook or the king ends that right; captures end the opponent's", () => {
  const pos = { fen: "r3k2r/8/8/8/8/8/8/R3K2R w - - 0 1", rights: { w: { k: "h1", q: "a1" }, b: { k: "h8", q: "a8" } }, uci: null, san: null };
  const after = playMove(pos, "a1a8")!;
  assert.deepEqual(after.rights, { w: { k: "h1", q: null }, b: { k: "h8", q: null } });
});

test("standard games: mate, repetition and the move text", () => {
  let positions = [standardStart()];
  for (const m of ["f2f3", "e7e5", "g2g4", "d8h4"]) positions.push(playMove(positions[positions.length - 1], m)!);
  assert.deepEqual(gameEnd(positions), { over: true, winner: "b", reason: "checkmate" });
  assert.equal(moveText(positions), "1.f3 e5 2.g4 Qh4#");
  positions = [standardStart()];
  for (const m of ["g1f3", "g8f6", "f3g1", "f6g8", "g1f3", "g8f6", "f3g1", "f6g8"]) positions.push(playMove(positions[positions.length - 1], m)!);
  assert.equal((gameEnd(positions) as any).reason, "repetition");
});
