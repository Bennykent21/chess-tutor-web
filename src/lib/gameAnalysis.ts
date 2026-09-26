import { Chess } from "chess.js";
import { analysePosition, EngineEvaluation } from "./engine";
import { TutorGameMistake } from "./storage";

export type GameAnalysisProgress = {
  current: number;
  total: number;
  label: string;
};

export type GameAnalysisResult = {
  gameId: string;
  mistakes: TutorGameMistake[];
  analyzedMoves: number;
};

function toUci(move: { from: string; to: string; promotion?: string }) {
  return move.from + move.to + (move.promotion ?? "");
}

function scoreForPlayer(evaluation: EngineEvaluation, playerColor: "w" | "b", sideToMove: "w" | "b"): number | null {
  const sign = sideToMove === playerColor ? 1 : -1;
  if (evaluation.mateIn !== null) return Math.sign(evaluation.mateIn) * 10000 * sign;
  if (evaluation.scoreCp !== null) return evaluation.scoreCp * sign;
  return null;
}

function bestMoveSan(fen: string, bestMove: string | null) {
  if (!bestMove) return bestMove ?? "the engine's recommendation";
  const game = new Chess(fen);
  const legal = game.moves({ verbose: true });
  const move = legal.find(candidate => toUci(candidate) === bestMove);
  if (!move) return bestMove;

  const played = game.move({
    from: move.from,
    to: move.to,
    promotion: move.promotion || "q"
  });
  return played?.san ?? bestMove;
}

function pvToSan(fen: string, principalVariation: string[]) {
  if (!principalVariation.length) return [];
  const game = new Chess(fen);
  const san: string[] = [];

  for (const uci of principalVariation.slice(0, 5)) {
    const legal = game.moves({ verbose: true }).find(move => toUci(move) === uci);
    if (!legal) break;
    const played = game.move({
      from: legal.from,
      to: legal.to,
      promotion: legal.promotion || "q"
    });
    if (!played) break;
    san.push(played.san);
  }

  return san;
}

function classifyMistake(
  lossCp: number,
  preEvaluation: EngineEvaluation,
  bestSan: string
): { severity: TutorGameMistake["severity"]; category: string } {
  if (preEvaluation.mateIn !== null && preEvaluation.mateIn > 0) {
    return {
      severity: "Blunder",
      category: "Missed Mate"
    };
  }

  if (bestSan.includes("#") || bestSan.includes("+")) {
    return {
      severity: lossCp >= 150 ? "Blunder" : "Mistake",
      category: "Missed Tactic"
    };
  }

  if (lossCp >= 250) {
    return {
      severity: "Blunder",
      category: "Material"
    };
  }

  return {
    severity: "Mistake",
    category: "Calculation"
  };
}

export async function analyseGame(
  pgn: string,
  args: {
    gameId: string;
    opponent: string;
    playerColor?: "w" | "b";
    maxPlayerMoves?: number;
    depth?: number;
    onProgress?: (progress: GameAnalysisProgress) => void;
  }
): Promise<GameAnalysisResult> {
  const playerColor = args.playerColor ?? "w";
  const maxPlayerMoves = args.maxPlayerMoves ?? 18;
  const depth = args.depth ?? 8;

  const loaded = new Chess();
  loaded.loadPgn(pgn);

  const history = loaded.history({ verbose: true });
  const playerMoves = history.filter(move => move.color === playerColor).slice(0, maxPlayerMoves);
  const mistakes: TutorGameMistake[] = [];
  const replay = new Chess();

  for (let index = 0; index < history.length; index += 1) {
    const move = history[index];

    if (move.color !== playerColor) {
      replay.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || "q"
      });
      continue;
    }

    if (playerMoves.findIndex(candidate => candidate === move) === -1) break;

    const moveNumber = Math.ceil((index + 1) / 2);
    const currentNumber = playerMoves.findIndex(candidate => candidate === move) + 1;
    args.onProgress?.({
      current: currentNumber,
      total: playerMoves.length,
      label: "Checking move " + moveNumber + "…"
    });

    const fenBefore = replay.fen();
    const legalMoves = replay.moves({ verbose: true });
    if (legalMoves.length <= 1) {
      replay.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || "q"
      });
      continue;
    }

    const before = await analysePosition(fenBefore, { depth, skillLevel: 20 });
    const actualUci = toUci(move);
    if (!before.bestMove || before.bestMove === actualUci) {
      replay.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion || "q"
      });
      continue;
    }

    const played = replay.move({
      from: move.from,
      to: move.to,
      promotion: move.promotion || "q"
    });
    if (!played) continue;

    const fenAfter = replay.fen();
    const after = await analysePosition(fenAfter, { depth: Math.max(6, depth - 1), skillLevel: 20 });

    const sideAfter = fenAfter.split(/\s+/)[1] === "b" ? "b" : "w";
    const beforeScore = scoreForPlayer(before, playerColor, playerColor);
    const afterScore = scoreForPlayer(after, playerColor, sideAfter);
    const lossCp = beforeScore !== null && afterScore !== null ? Math.max(0, Math.round(beforeScore - afterScore)) : 0;

    if (lossCp < 75) continue;

    const bestSan = bestMoveSan(fenBefore, before.bestMove);
    const { severity, category } = classifyMistake(lossCp, before, bestSan);
    const pvSan = pvToSan(fenBefore, before.principalVariation);

    mistakes.push({
      key: [args.gameId, index + 1].join(":"),
      gameId: args.gameId,
      opponent: args.opponent,
      moveNumber,
      san: played.san,
      fen: fenBefore,
      category,
      severity,
      expected: before.bestMove,
      goal: `Find a stronger move than ${played.san}.`,
      hint: `Stockfish prefers ${bestSan}. Scan forcing moves before committing.`,
      success: `The stronger move is ${bestSan}. The position changed by about ${Math.round(lossCp / 10) / 10} pawns.`,
      evaluationBefore: before.mateIn !== null ? null : before.scoreCp,
      evaluationAfter: after.mateIn !== null ? null : scoreForPlayer(after, playerColor, sideAfter),
      lossCp,
      bestLine: pvSan,
      createdAt: new Date().toISOString()
    });
  }

  args.onProgress?.({
    current: playerMoves.length,
    total: playerMoves.length,
    label: mistakes.length ? `${mistakes.length} review-worthy mistake${mistakes.length === 1 ? "" : "s"} found` : "No review-worthy mistakes found"
  });

  return {
    gameId: args.gameId,
    mistakes,
    analyzedMoves: playerMoves.length
  };
}
