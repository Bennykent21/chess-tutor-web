/**
 * Play a friend on this device (the app's Phase 11), including Chess960 starts.
 *
 * chess.js knows standard castling only, so a Chess960 game keeps its own castling rights (the
 * squares of the rooks that may still castle) and offers castling as the king moving onto its own
 * rook, as the app does. The king still ends on g or c and the rook on f or d.
 */
import { Chess, Square } from "chess.js";
import { positionKey } from "./repertoire";

type Color = "w" | "b";

/** The rooks that may still castle, by their squares; null where that right is gone. */
export interface Rights960 {
  w: { k: string | null; q: string | null };
  b: { k: string | null; q: string | null };
}

export interface GamePosition {
  fen: string;
  /** Chess960 castling rights; null in a standard game (chess.js keeps them in the FEN). */
  rights: Rights960 | null;
  /** The move that led here, or null at the start. */
  uci: string | null;
  san: string | null;
}

/* Chess960 starts ------------------------------------------------------------------ */

const KNIGHTS: [number, number][] = [
  [0, 1], [0, 2], [0, 3], [0, 4], [1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4]
];

/** White's back rank for start [n] (0 to 959, Scharnagl's numbering; 518 is the normal start). */
export function backRank960(n: number): string {
  if (!Number.isInteger(n) || n < 0 || n > 959) throw new Error("Chess960 positions are numbered 0 to 959");
  const rank: (string | null)[] = Array(8).fill(null);
  const empty = () => rank.map((p, i) => (p === null ? i : -1)).filter(i => i >= 0);
  let m = n;
  rank[2 * (m % 4) + 1] = "B";
  m = Math.floor(m / 4);
  rank[2 * (m % 4)] = "B";
  m = Math.floor(m / 4);
  rank[empty()[m % 6]] = "Q";
  m = Math.floor(m / 6);
  const [a, b] = KNIGHTS[m];
  const free = empty();
  rank[free[a]] = "N";
  rank[free[b]] = "N";
  const last = empty();
  rank[last[0]] = "R";
  rank[last[1]] = "K";
  rank[last[2]] = "R";
  return rank.join("");
}

export function random960(): number {
  return Math.floor(Math.random() * 960);
}

/** The start position for [n], with its castling rights. */
export function start960(n: number): GamePosition {
  const white = backRank960(n);
  const rooks = [...white].map((p, i) => (p === "R" ? i : -1)).filter(i => i >= 0);
  const file = (i: number) => "abcdefgh"[i];
  return {
    fen: `${white.toLowerCase()}/pppppppp/8/8/8/8/PPPPPPPP/${white} w - - 0 1`,
    rights: {
      w: { k: `${file(rooks[1])}1`, q: `${file(rooks[0])}1` },
      b: { k: `${file(rooks[1])}8`, q: `${file(rooks[0])}8` }
    },
    uci: null,
    san: null
  };
}

export function standardStart(fen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"): GamePosition {
  return { fen, rights: null, uci: null, san: null };
}

/* Castling in Chess960 --------------------------------------------------------------- */

const FILES = "abcdefgh";

function kingSquare(chess: Chess, color: Color): string | null {
  for (const row of chess.board()) for (const sq of row) if (sq && sq.type === "k" && sq.color === color) return sq.square;
  return null;
}

interface Castle {
  uci: string;
  side: "k" | "q";
  king: string;
  rook: string;
  kingTo: string;
  rookTo: string;
}

/** The castling moves open now in a Chess960 position, each as the king onto its rook ("b1a1"). */
export function castles960(pos: GamePosition): Castle[] {
  if (!pos.rights) return [];
  const chess = new Chess(pos.fen);
  const color = chess.turn();
  const opp: Color = color === "w" ? "b" : "w";
  const rank = color === "w" ? "1" : "8";
  const king = kingSquare(chess, color);
  if (!king || king[1] !== rank || chess.inCheck()) return [];
  const out: Castle[] = [];
  for (const side of ["k", "q"] as const) {
    const rook = pos.rights[color][side];
    if (!rook) continue;
    const piece = chess.get(rook as Square);
    if (!piece || piece.type !== "r" || piece.color !== color) continue;
    const kingTo = `${side === "k" ? "g" : "c"}${rank}`;
    const rookTo = `${side === "k" ? "f" : "d"}${rank}`;
    const files = [king, rook, kingTo, rookTo].map(s => FILES.indexOf(s[0]));
    let clear = true;
    for (let f = Math.min(...files); f <= Math.max(...files); f++) {
      const sq = `${FILES[f]}${rank}`;
      if (sq !== king && sq !== rook && chess.get(sq as Square)) clear = false;
    }
    if (!clear) continue;
    const kf = FILES.indexOf(king[0]);
    const tf = FILES.indexOf(kingTo[0]);
    let safe = true;
    for (let f = Math.min(kf, tf); f <= Math.max(kf, tf); f++) {
      if (chess.isAttacked(`${FILES[f]}${rank}` as Square, opp)) safe = false;
    }
    if (!safe) continue;
    out.push({ uci: `${king}${rook}`, side, king, rook, kingTo, rookTo });
  }
  return out;
}

function nextFen(chess: Chess, before: string, resetHalfmove: boolean): string {
  const [, turn, , , half, full] = before.split(" ");
  const board = chess.fen().split(" ")[0];
  const nextTurn = turn === "w" ? "b" : "w";
  const halfmove = resetHalfmove ? 0 : Number(half) + 1;
  const fullmove = Number(full) + (turn === "b" ? 1 : 0);
  return `${board} ${nextTurn} - - ${halfmove} ${fullmove}`;
}

/** The position after [uci], or null when it is not legal. */
export function playMove(pos: GamePosition, uci: string): GamePosition | null {
  if (!pos.rights) {
    const chess = new Chess(pos.fen);
    try {
      const m = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined });
      return { fen: chess.fen(), rights: null, uci: m.from + m.to + (m.promotion ?? ""), san: m.san };
    } catch {
      return null;
    }
  }
  const castle = castles960(pos).find(c => c.uci === uci);
  const color = pos.fen.split(" ")[1] as Color;
  const rights: Rights960 = { w: { ...pos.rights.w }, b: { ...pos.rights.b } };
  if (castle) {
    const chess = new Chess(pos.fen);
    chess.remove(castle.king as Square);
    chess.remove(castle.rook as Square);
    chess.put({ type: "k", color }, castle.kingTo as Square);
    chess.put({ type: "r", color }, castle.rookTo as Square);
    rights[color] = { k: null, q: null };
    const fen = nextFen(chess, pos.fen, false);
    const after = new Chess(fen);
    const suffix = after.isCheckmate() ? "#" : after.inCheck() ? "+" : "";
    return { fen, rights, uci, san: (castle.side === "k" ? "O-O" : "O-O-O") + suffix };
  }
  const chess = new Chess(pos.fen);
  let m;
  try {
    m = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined });
  } catch {
    return null;
  }
  const opp: Color = color === "w" ? "b" : "w";
  if (m.piece === "k") rights[color] = { k: null, q: null };
  for (const side of ["k", "q"] as const) {
    if (rights[color][side] === m.from) rights[color][side] = null;
    if (rights[opp][side] === m.to) rights[opp][side] = null;
  }
  // chess.js's own FEN: castling stays "-", the en-passant square and clocks are right.
  return { fen: chess.fen(), rights, uci: m.from + m.to + (m.promotion ?? ""), san: m.san };
}

/** Every move open now: chess.js's, plus Chess960 castling. */
export function extraMoves(pos: GamePosition): string[] {
  return castles960(pos).map(c => c.uci);
}

/* How a game ends ----------------------------------------------------------------- */

export type GameEnd =
  | { over: false }
  | { over: true; winner: Color | null; reason: "checkmate" | "stalemate" | "insufficient" | "fifty-moves" | "repetition" };

function repetitionKeyOf(pos: GamePosition): string {
  const key = positionKey(new Chess(pos.fen));
  if (!pos.rights) return key;
  const r = pos.rights;
  return `${key} ${[r.w.k, r.w.q, r.b.k, r.b.q].map(x => x ?? "-").join("")}`;
}

export function gameEnd(positions: GamePosition[]): GameEnd {
  const pos = positions[positions.length - 1];
  const chess = new Chess(pos.fen);
  if (chess.isCheckmate()) return { over: true, winner: chess.turn() === "w" ? "b" : "w", reason: "checkmate" };
  if (chess.isStalemate() && castles960(pos).length === 0) return { over: true, winner: null, reason: "stalemate" };
  if (chess.isInsufficientMaterial()) return { over: true, winner: null, reason: "insufficient" };
  if (Number(pos.fen.split(" ")[4]) >= 100) return { over: true, winner: null, reason: "fifty-moves" };
  const key = repetitionKeyOf(pos);
  if (positions.filter(p => repetitionKeyOf(p) === key).length >= 3) return { over: true, winner: null, reason: "repetition" };
  return { over: false };
}

/** "1.e4 e5 2.Nf3" for the moves after the start. */
export function moveText(positions: GamePosition[]): string {
  const start = positions[0].fen.split(" ");
  let number = Number(start[5]) || 1;
  let white = start[1] === "w";
  const out: string[] = [];
  positions.slice(1).forEach((p, i) => {
    if (white) out.push(`${number}.${p.san}`);
    else {
      out.push(i === 0 ? `${number}...${p.san}` : `${p.san}`);
      number++;
    }
    white = !white;
  });
  return out.join(" ");
}

/** A PGN for the history, with the start position when it is not the normal one. */
export function friendPgn(positions: GamePosition[], white: string, black: string, result: string): string {
  const start = positions[0];
  const headers = [`[White "${white}"]`, `[Black "${black}"]`, `[Result "${result}"]`];
  if (start.rights || start.fen !== standardStart().fen) {
    headers.push(`[SetUp "1"]`, `[FEN "${start.fen}"]`);
    if (start.rights) headers.push(`[Variant "Chess960"]`);
  }
  return `${headers.join("\n")}\n\n${moveText(positions)} ${result}`;
}
