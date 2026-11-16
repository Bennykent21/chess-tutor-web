/**
 * Your own opening lines (the app's Phase 12 "Your openings"): lines the player builds move by
 * move, drills, and plays out against Stockfish. Each line becomes a one-line repertoire book, so
 * it is drilled by the same learn run and joins the same spaced review as the taught openings.
 */
import { Chess } from "chess.js";
import { RepertoireBook, RepertoireNode, START_FEN, playUci, positionKey } from "./repertoire";

export interface MyLine {
  id: string;
  name: string;
  side: "w" | "b";
  moves: string[];
}

export const MY_LINE_PREFIX = "mine-";

export function myLineBookId(line: MyLine): string {
  return `${MY_LINE_PREFIX}${line.id}`;
}

/** [wanted], or "[wanted] 2" and so on when that name is taken. */
export function freeName(wanted: string, taken: string[]): string {
  const base = wanted.trim() || "My line";
  if (!taken.includes(base)) return base;
  for (let n = 2; ; n++) if (!taken.includes(`${base} ${n}`)) return `${base} ${n}`;
}

/** "1.e4 e5 2.Nf3 Nc6" for a line from the start. */
export function sanLine(moves: string[]): string {
  const chess = new Chess();
  const out: string[] = [];
  for (let i = 0; i < moves.length; i++) {
    const uci = moves[i];
    try {
      const m = chess.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci.length > 4 ? uci[4] : undefined });
      out.push(i % 2 === 0 ? `${i / 2 + 1}.${m.san}` : m.san);
    } catch {
      break;
    }
  }
  return out.join(" ");
}

export function endFen(moves: string[]): string {
  let fen = START_FEN;
  for (const uci of moves) {
    const next = playUci(fen, uci);
    if (!next) break;
    fen = next.fen();
  }
  return fen;
}

/** The line as a one-line book: the player's positions are cards, the other side's have one reply. */
export function lineBook(line: MyLine): RepertoireBook {
  const nodes = new Map<string, RepertoireNode>();
  let chess = new Chess();
  for (let ply = 0; ply < line.moves.length; ply++) {
    const uci = line.moves[ply];
    const key = positionKey(chess);
    const own = chess.turn() === line.side;
    if (!nodes.has(key)) {
      nodes.set(key, {
        key,
        ply,
        own,
        games: [],
        dataBacked: false,
        level: 0,
        reach: 1,
        evalCp: null,
        mate: null,
        move: own ? uci : null,
        also: [],
        moveShare: null,
        pitfall: null,
        replies: own
          ? []
          : [{ uci, games: [], share: 1, bandShares: [], dataBacked: false, verdict: null, loss: null, punish: false, level: 0 }],
        note: null,
        name: null
      });
    }
    const next = playUci(chess.fen(), uci);
    if (!next) break;
    chess = next;
  }
  return { id: myLineBookId(line), title: line.name, side: line.side, start: [], bands: [], nodes };
}
