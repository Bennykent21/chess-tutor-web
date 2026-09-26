export type EngineEvaluation = {
  depth: number;
  scoreCp: number | null;
  mateIn: number | null;
  bestMove: string | null;
  principalVariation: string[];
};

type PendingRequest = {
  resolve: (value: EngineEvaluation) => void;
  reject: (reason?: unknown) => void;
};

import engineScriptUrl from "stockfish/bin/stockfish-19-lite-single.js?url";
import engineWasmUrl from "stockfish/bin/stockfish-19-lite-single.wasm?url";

let worker: Worker | null = null;
let readyPromise: Promise<void> | null = null;
let pending: PendingRequest | null = null;

function parseInfo(line: string, sideToMove: "w" | "b", latest: EngineEvaluation): EngineEvaluation {
  const depthMatch = line.match(/\bdepth (\d+)/);
  if (depthMatch) latest.depth = Number(depthMatch[1]);

  const scoreMatch = line.match(/\bscore (cp|mate) (-?\d+)/);
  if (scoreMatch) {
    const raw = Number(scoreMatch[2]);
    if (scoreMatch[1] === "cp") {
      latest.scoreCp = sideToMove === "w" ? raw : -raw;
      latest.mateIn = null;
    } else {
      latest.mateIn = sideToMove === "w" ? raw : -raw;
      latest.scoreCp = null;
    }
  }

  const pvMatch = line.match(/\bpv (.+)$/);
  if (pvMatch) latest.principalVariation = pvMatch[1].trim().split(/\s+/);

  return latest;
}

function createWorker(): Worker {
  const source = `
self.Module = {
  locateFile: function(path) {
    return ${JSON.stringify(engineWasmUrl)};
  }
};
importScripts(${JSON.stringify(engineScriptUrl)});
`;
  const blob = new Blob([source], { type: "application/javascript" });
  const url = URL.createObjectURL(blob);
  const nextWorker = new Worker(url);
  URL.revokeObjectURL(url);
  return nextWorker;
}

function ensureWorker(): Promise<void> {
  if (readyPromise) return readyPromise;

  readyPromise = new Promise((resolve, reject) => {
    try {
      worker = createWorker();
      worker.addEventListener("message", event => {
        const line = typeof event.data === "string" ? event.data : "";
        if (line === "uciok" || line === "readyok") {
          if (line === "readyok") resolve();
          return;
        }

        if (line.startsWith("bestmove ")) {
          const move = line.split(/\s+/)[1] ?? null;
          if (pending) {
            const request = pending;
            pending = null;
            request.resolve((request as unknown as { evaluation?: EngineEvaluation }).evaluation ?? {
              depth: 0,
              scoreCp: null,
              mateIn: null,
              bestMove: move,
              principalVariation: []
            });
          }
        }
      });

      worker.addEventListener("error", event => {
        if (pending) {
          const request = pending;
          pending = null;
          request.reject(event.error ?? new Error("Stockfish worker failed."));
        }
        readyPromise = null;
        worker = null;
        reject(event.error ?? new Error("Stockfish worker failed."));
      });

      worker.postMessage("uci");
      worker.postMessage("isready");
    } catch (error) {
      readyPromise = null;
      worker = null;
      reject(error);
    }
  });

  return readyPromise;
}

export async function analysePosition(
  fen: string,
  options: { depth?: number; skillLevel?: number } = {}
): Promise<EngineEvaluation> {
  await ensureWorker();

  if (!worker) {
    throw new Error("Stockfish worker is unavailable.");
  }

  if (pending) {
    worker.postMessage("stop");
    pending.reject(new Error("Superseded by a newer analysis."));
    pending = null;
  }

  const depth = Math.max(6, Math.min(18, options.depth ?? 10));
  const skillLevel = Math.max(0, Math.min(20, options.skillLevel ?? 20));
  const sideToMove = fen.split(/\s+/)[1] === "b" ? "b" : "w";
  let evaluation: EngineEvaluation = {
    depth: 0,
    scoreCp: null,
    mateIn: null,
    bestMove: null,
    principalVariation: []
  };

  return new Promise((resolve, reject) => {
    if (!worker) {
      reject(new Error("Stockfish worker is unavailable."));
      return;
    }

    pending = {
      resolve: value => resolve(value),
      reject
    };

    const onMessage = (event: MessageEvent) => {
      const line = typeof event.data === "string" ? event.data : "";
      if (line.startsWith("info ")) {
        evaluation = parseInfo(line, sideToMove, evaluation);
      }
      if (line.startsWith("bestmove ")) {
        evaluation.bestMove = line.split(/\s+/)[1] ?? null;
        const request = pending;
        pending = null;
        worker?.removeEventListener("message", onMessage);
        request?.resolve(evaluation);
      }
    };

    worker.addEventListener("message", onMessage);
    worker.postMessage(`setoption name Skill Level value ${skillLevel}`);
    worker.postMessage("position fen " + fen);
    worker.postMessage(`go depth ${depth}`);
  });
}

export async function findBestMove(
  fen: string,
  options: { depth?: number; skillLevel?: number } = {}
): Promise<string | null> {
  try {
    const evaluation = await analysePosition(fen, options);
    return evaluation.bestMove;
  } catch {
    return null;
  }
}

export function disposeEngine() {
  if (pending) {
    pending.reject(new Error("Stockfish engine disposed."));
    pending = null;
  }
  worker?.terminate();
  worker = null;
  readyPromise = null;
}
