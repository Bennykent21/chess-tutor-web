/**
 * "From your games" (ported from the Android app's domain/train/GameFindings): the learner's
 * repeated mistakes in their saved games. Line slips and endings need no engine; repeated
 * mistakes use the reviews the learner already ran. Only findings with enough games behind
 * them are kept.
 */
import { Chess } from "chess.js";
import { parsePgnSafely } from "../lib/chessUtils";
import type { GameReviewReport } from "./account";
import {
  RepertoireBook,
  RepertoireIndex,
  START_FEN,
  isCard,
  nodeAt,
  playUci
} from "./repertoire";

/** One game as the findings need it. */
export interface FindingGame {
  id: string;
  userColor: "w" | "b";
  outcome: "win" | "loss" | "draw" | "unknown";
  /** UCI moves from the standard start. */
  moves: string[];
  opening: string | null;
}

export interface LineSlip {
  kind: "line-slip";
  bookId: string;
  bookTitle: string;
  side: "w" | "b";
  fen: string;
  path: string[];
  after: string | null;
  played: string;
  right: string;
  misses: number;
  reached: number;
  note: string | null;
  weight: number;
}

export type EndingKind = "rook" | "pawn";
export const ENDINGS: Record<EndingKind, { title: string; setId: string }> = {
  rook: { title: "Rook endings", setId: "rook-endings" },
  pawn: { title: "King and pawn", setId: "king-pawn" }
};

export interface EndingResult {
  kind: "ending";
  ending: EndingKind;
  won: number;
  reached: number;
  weight: number;
}

export interface RepeatedMistake {
  kind: "mistake";
  fen: string;
  opening: string | null;
  after: string | null;
  played: string;
  better: string | null;
  times: number;
  reached: number;
  weight: number;
}

export type GameFinding = LineSlip | EndingResult | RepeatedMistake;

export const MIN_SLIPS = 2;
export const MIN_ENDINGS = 3;
export const MIN_MISTAKES = 2;
export const OPENING_PLIES = 30;

/** "3.e5" or "3...e6". */
function numbered(fen: string, uci: string): string {
  const after = playUci(fen, uci);
  const parts = fen.split(" ");
  const number = `${parts[5] ?? "1"}${parts[1] === "w" ? "." : "..."}`;
  if (!after) return uci;
  const history = after.history();
  return number + (history[history.length - 1] ?? uci);
}

function firstSentence(text: string): string {
  const i = text.indexOf(". ");
  const s = i >= 0 ? text.slice(0, i) : text;
  return s.endsWith(".") ? s : `${s}.`;
}

export function lineSlips(games: FindingGame[], books: RepertoireBook[]): LineSlip[] {
  const out: LineSlip[] = [];
  for (const book of books) {
    const reached = new Map<string, number>();
    const missed = new Map<string, string[]>();
    const before = new Map<string, { fen: string; after: string | null }>();
    for (const game of games) {
      if (game.userColor !== book.side) continue;
      let fen = START_FEN;
      let previous: string | null = null;
      for (let ply = 0; ply < game.moves.length && ply < OPENING_PLIES; ply++) {
        const uci = game.moves[ply];
        const node = nodeAt(book, fen);
        if (node && node.own && isCard(book, node) && node.move && fen.split(" ")[1] === book.side) {
          reached.set(node.key, (reached.get(node.key) ?? 0) + 1);
          if (!before.has(node.key)) before.set(node.key, { fen, after: previous });
          if (uci !== node.move && !node.also.includes(uci)) {
            missed.set(node.key, [...(missed.get(node.key) ?? []), uci]);
            break;
          }
        }
        const next = playUci(fen, uci);
        if (!next) break;
        previous = numbered(fen, uci);
        fen = next.fen();
      }
    }
    let index: RepertoireIndex | null = null;
    for (const [key, moves] of missed) {
      if (moves.length < MIN_SLIPS) continue;
      const node = book.nodes.get(key);
      const at = before.get(key);
      if (!node || !at) continue;
      index ??= new RepertoireIndex(book);
      const counts = new Map<string, number>();
      for (const m of moves) counts.set(m, (counts.get(m) ?? 0) + 1);
      const common = [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0];
      out.push({
        kind: "line-slip",
        bookId: book.id,
        bookTitle: book.title,
        side: book.side,
        fen: at.fen,
        path: index.pathTo(key) ?? [],
        after: at.after,
        played: numbered(at.fen, common),
        right: numbered(at.fen, node.move!),
        misses: moves.length,
        reached: reached.get(key) ?? moves.length,
        note: node.note ? firstSentence(node.note.text) : null,
        weight: moves.length * 3
      });
    }
  }
  return out;
}

type Board = ReturnType<Chess["board"]>;

/** Which ending the position is, if any: only kings and pawns, or only rooks besides them. */
export function endingKindOf(board: Board): EndingKind | null {
  const pieces = board.flat().filter(Boolean) as { type: string }[];
  const others = pieces.filter(p => p.type !== "k" && p.type !== "p");
  if (!others.length) return pieces.some(p => p.type === "p") ? "pawn" : null;
  return others.every(p => p.type === "r") ? "rook" : null;
}

const VALUES: Record<string, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

/** The learner's material lead in pawns. */
export function materialLead(board: Board, side: "w" | "b"): number {
  let lead = 0;
  for (const sq of board.flat()) if (sq) lead += (sq.color === side ? 1 : -1) * VALUES[sq.type];
  return lead;
}

export function endingResults(games: FindingGame[]): EndingResult[] {
  const kinds = Object.keys(ENDINGS) as EndingKind[];
  const reached: Record<EndingKind, number> = { rook: 0, pawn: 0 };
  const won: Record<EndingKind, number> = { rook: 0, pawn: 0 };
  for (const game of games) {
    if (game.outcome === "unknown") continue;
    // One replay per game: each ply's ending kind and the learner's lead.
    const chess = new Chess();
    const seen: { kind: EndingKind | null; lead: number }[] = [];
    const look = () => {
      const board = chess.board();
      seen.push({ kind: endingKindOf(board), lead: materialLead(board, game.userColor) });
    };
    look();
    for (const uci of game.moves) {
      try {
        chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined });
      } catch {
        break;
      }
      look();
    }
    for (const kind of kinds) {
      const hit = seen.some((now, i) => now.kind === kind && now.lead >= 1 && (seen[i + 1] ?? now).lead >= 1);
      if (hit) {
        reached[kind]++;
        if (game.outcome === "win") won[kind]++;
      }
    }
  }
  return kinds
    .filter(kind => reached[kind] >= MIN_ENDINGS)
    .map(kind => ({ kind: "ending" as const, ending: kind, won: won[kind], reached: reached[kind], weight: (reached[kind] - won[kind]) * 2 }));
}

function keyOf(fen: string): string {
  return fen.split(" ").slice(0, 4).join(" ");
}

export function repeatedMistakes(games: FindingGame[], reviews: Record<string, GameReviewReport>): RepeatedMistake[] {
  const made = new Map<string, { game: FindingGame; ply: number }[]>();
  const reached = new Map<string, number>();
  for (const game of games) {
    const review = reviews[game.id];
    if (!review) continue;
    const mine = review.moves.filter(m => m.mover === game.userColor && m.ply <= OPENING_PLIES);
    for (const k of new Set(mine.map(m => keyOf(m.fenBefore)))) reached.set(k, (reached.get(k) ?? 0) + 1);
    for (const m of mine) {
      if (m.quality !== "mistake" && m.quality !== "blunder") continue;
      const k = `${keyOf(m.fenBefore)}|${m.uci}`;
      made.set(k, [...(made.get(k) ?? []), { game, ply: m.ply }]);
    }
  }
  const out: RepeatedMistake[] = [];
  for (const [k, where] of made) {
    if (where.length < MIN_MISTAKES) continue;
    const { game, ply } = where[0];
    const review = reviews[game.id];
    const move = review.moves.find(m => m.ply === ply);
    if (!move) continue;
    const prior = review.moves.find(m => m.ply === ply - 1);
    const position = k.split("|")[0];
    const number = `${move.fenBefore.split(" ")[5] ?? "1"}${move.mover === "w" ? "." : "..."}`;
    out.push({
      kind: "mistake",
      fen: move.fenBefore,
      opening: where.map(w => w.game.opening).find(Boolean) ?? null,
      after: prior ? numbered(prior.fenBefore, prior.uci) : null,
      played: numbered(move.fenBefore, move.uci),
      better: move.bestSan ? number + move.bestSan : null,
      times: where.length,
      reached: reached.get(position) ?? where.length,
      weight: where.length * 3
    });
  }
  return out;
}

export function gameFindings(
  games: FindingGame[],
  books: RepertoireBook[],
  reviews: Record<string, GameReviewReport>
): GameFinding[] {
  return [...lineSlips(games, books), ...endingResults(games), ...repeatedMistakes(games, reviews)].sort(
    (a, b) => b.weight - a.weight
  );
}

/** A saved or imported game as the findings read it, or null when it cannot be replayed from the start. */
export function findingGameOf(game: {
  id?: string;
  pgn?: string;
  playerColor?: "w" | "b";
  userColor?: "w" | "b";
  result: "W" | "L" | "D";
  opening?: string;
}): FindingGame | null {
  if (!game.id || !game.pgn) return null;
  if (/\[(SetUp|FEN)\s/i.test(game.pgn)) return null;
  const moves = parsePgnSafely(game.pgn).moves.map(m => m.from + m.to + (m.promotion ?? ""));
  if (!moves.length) return null;
  return {
    id: game.id,
    userColor: game.userColor ?? game.playerColor ?? "w",
    outcome: game.result === "W" ? "win" : game.result === "L" ? "loss" : game.result === "D" ? "draw" : "unknown",
    moves,
    opening: game.opening || null
  };
}
