import { Chess, Move, PieceSymbol, Square } from "chess.js";

export type CapturedPiecesSummary = {
  capturedByWhite: PieceSymbol[];
  capturedByBlack: PieceSymbol[];
  whiteMaterialAdvantage: number; // positive = white ahead, negative = black ahead
};

const PIECE_VALUES: Record<PieceSymbol, number> = {
  p: 1,
  n: 3,
  b: 3,
  r: 5,
  q: 9,
  k: 0
};

const PIECE_SORT_ORDER: Record<PieceSymbol, number> = {
  q: 0,
  r: 1,
  b: 2,
  n: 3,
  p: 4,
  k: 5
};

export function toUci(move: { from: string; to: string; promotion?: string }): string {
  return move.from + move.to + (move.promotion ?? "");
}

export function parseUci(uci: string): { from: Square; to: Square; promotion?: "q" | "r" | "b" | "n" } | null {
  const clean = uci.trim().toLowerCase();
  if (!/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(clean)) return null;
  return {
    from: clean.slice(0, 2) as Square,
    to: clean.slice(2, 4) as Square,
    promotion: clean.length === 5 ? (clean[4] as "q" | "r" | "b" | "n") : undefined
  };
}

/**
 * Invariant check: verifies whether a UCI move is legal in the given FEN.
 * Never invent hints or solutions that fail this check.
 */
export function isUciLegalInFen(fen: string, uci: string): boolean {
  if (!uci) return false;
  try {
    const game = new Chess(fen);
    const parsed = parseUci(uci);
    if (!parsed) return false;
    return game.moves({ verbose: true }).some(m =>
      m.from === parsed.from &&
      m.to === parsed.to &&
      (!parsed.promotion || m.promotion === parsed.promotion)
    );
  } catch {
    return false;
  }
}

export function uciToSan(fen: string, uci: string): string {
  try {
    const game = new Chess(fen);
    const parsed = parseUci(uci);
    if (!parsed) return uci;
    const match = game.moves({ verbose: true }).find(m =>
      m.from === parsed.from &&
      m.to === parsed.to &&
      (!parsed.promotion || m.promotion === parsed.promotion)
    );
    return match ? match.san : uci;
  } catch {
    return uci;
  }
}

export function uciToPieceName(fen: string, uci: string): string {
  try {
    const game = new Chess(fen);
    const parsed = parseUci(uci);
    if (!parsed) return "piece";
    const piece = game.get(parsed.from);
    if (!piece) return "piece";
    const names: Record<PieceSymbol, string> = {
      p: "pawn",
      n: "knight",
      b: "bishop",
      r: "rook",
      q: "queen",
      k: "king"
    };
    return names[piece.type];
  } catch {
    return "piece";
  }
}

/**
 * Computes captured pieces strictly from the actual move list (never from missing pieces on custom FENs).
 */
export function calculateCapturesFromMoves(moves: Move[]): CapturedPiecesSummary {
  const capturedByWhite: PieceSymbol[] = [];
  const capturedByBlack: PieceSymbol[] = [];

  for (const m of moves) {
    if (m.captured) {
      if (m.color === "w") {
        capturedByWhite.push(m.captured);
      } else {
        capturedByBlack.push(m.captured);
      }
    }
  }

  capturedByWhite.sort((a, b) => PIECE_SORT_ORDER[a] - PIECE_SORT_ORDER[b]);
  capturedByBlack.sort((a, b) => PIECE_SORT_ORDER[a] - PIECE_SORT_ORDER[b]);

  const whiteSum = capturedByWhite.reduce((acc, p) => acc + PIECE_VALUES[p], 0);
  const blackSum = capturedByBlack.reduce((acc, p) => acc + PIECE_VALUES[p], 0);

  return {
    capturedByWhite,
    capturedByBlack,
    whiteMaterialAdvantage: whiteSum - blackSum
  };
}

/**
 * Robust PGN / SAN move tokenizer that strips headers, comments ({...}, ;...),
 * nested variations ((...)), NAGs ($1, $15), move numbers, and normalizes 0-0 -> O-O.
 */
export function tokenizePgnMoves(pgn: string): string[] {
  if (!pgn) return [];

  // Remove header lines [Tag "Value"]
  let body = pgn.replace(/\[[^\]]*\]\s*/g, " ");

  // Remove semicolon comments to end of line
  body = body.replace(/;[^\n]*/g, " ");

  // Remove brace comments {...}
  body = body.replace(/\{[^}]*\}/g, " ");

  // Remove nested parenthetical variations (...) iteratively
  let prev = "";
  while (prev !== body) {
    prev = body;
    body = body.replace(/\([^()]*\)/g, " ");
  }

  const rawTokens = body.trim().split(/\s+/);
  const resultTokens = new Set(["1-0", "0-1", "1/2-1/2", "*"]);
  const cleanTokens: string[] = [];

  for (let tok of rawTokens) {
    if (!tok) continue;
    // Strip NAGs ($1, $2, etc.)
    if (/^\$\d+$/.test(tok)) continue;
    // Strip leading move numbers like "1.", "12...", "1.e4" -> "e4"
    tok = tok.replace(/^\d+\.+/, "");
    if (!tok) continue;
    if (resultTokens.has(tok)) continue;
    // Strip trailing !/? annotations
    tok = tok.replace(/[!?]+$/g, "");
    if (!tok) continue;
    // Normalize castling zeros to O
    if (tok === "0-0") tok = "O-O";
    else if (tok === "0-0-0") tok = "O-O-O";
    else if (tok.startsWith("0-0-0")) tok = "O-O-O" + tok.slice(5);
    else if (tok.startsWith("0-0")) tok = "O-O" + tok.slice(3);

    cleanTokens.push(tok);
  }

  return cleanTokens;
}

export function parsePgnSafely(pgn: string): {
  moves: Move[];
  incomplete: boolean;
  finalFen: string;
} {
  const tokens = tokenizePgnMoves(pgn);
  const chess = new Chess();
  const played: Move[] = [];
  let incomplete = false;

  for (const token of tokens) {
    try {
      const m = chess.move(token);
      if (!m) {
        incomplete = true;
        break;
      }
      played.push(m);
    } catch {
      incomplete = true;
      break;
    }
  }

  return {
    moves: played,
    incomplete,
    finalFen: chess.fen()
  };
}
