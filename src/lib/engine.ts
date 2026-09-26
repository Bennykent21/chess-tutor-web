import engineScriptUrl from "stockfish/bin/stockfish-19-lite-single.js?url";
import engineWasmUrl from "stockfish/bin/stockfish-19-lite-single.wasm?url";

export type EngineEvaluation = {
  depth: number;
  scoreCp: number | null;
  mateIn: number | null;
  bestMove: string | null;
  principalVariation: string[];
};

type ActiveAnalysis = {
  sideToMove: "w" | "b";
  evaluation: EngineEvaluation;
  resolve: (value: EngineEvaluation) => void;
  reject: (reason?: unknown) => void;
};

let worker: Worker | null = null;
let readyPromise: Promise<void> | null = null;
let readyResolve: (() => void) | null = null;
let readyReject: ((reason?: unknown) => void) | null = null;
let active: ActiveAnalysis | null = null;

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
    readyResolve = resolve;
    readyReject = reject;

    try {
      worker = createWorker();
      worker.addEventListener("message", event => {
        const line = typeof event.data === "string" ? event.data : "";

        if (line === "readyok") {
          readyResolve?.();
          readyResolve = null;
          readyReject = null;
          return;
        }

        if (!active) return;

        if (line.startsWith("info ")) {
          active.evaluation = parseInfo(line, active.sideToMove, active.evaluation);
          return;
        }

        if (line.startsWith("bestmove ")) {
          active.evaluation.bestMove = line.split(/\s+/)[1] ?? null;
          const request = active;
          active = null;
          request.resolve(request.evaluation);
        }
      });

      worker.addEventListener("error", event => {
        const error = event.error ?? new Error("Stockfish worker failed.");
        active?.reject(error);
        active = null;
        readyReject?.(error);
        readyResolve = null;
        readyReject = null;
        readyPromise = null;
        worker = null;
      });

      worker.postMessage("uci");
      worker.postMessage("isready");
    } catch (error) {
      readyPromise = null;
      readyResolve = null;
      readyReject = null;
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

  if (active) {
    worker.postMessage("stop");
    active.reject(new Error("Superseded by a newer analysis."));
    active = null;
  }

  const depth = Math.max(6, Math.min(18, options.depth ?? 10));
  const skillLevel = Math.max(0, Math.min(20, options.skillLevel ?? 20));
  const sideToMove = fen.split(/\s+/)[1] === "b" ? "b" : "w";

  return new Promise((resolve, reject) => {
    active = {
      sideToMove,
      evaluation: {
        depth: 0,
        scoreCp: null,
        mateIn: null,
        bestMove: null,
        principalVariation: []
      },
      resolve,
      reject
    };

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
    return (await analysePosition(fen, options)).bestMove;
  } catch {
    return null;
  }
}

export function disposeEngine() {
  if (active) {
    active.reject(new Error("Stockfish engine disposed."));
    active = null;
  }
  worker?.terminate();
  worker = null;
  readyPromise = null;
  readyResolve = null;
  readyReject = null;
}
