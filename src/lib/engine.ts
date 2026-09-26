import engineScriptUrl from "stockfish/bin/stockfish-19-lite-single.js?url";
import engineWasmUrl from "stockfish/bin/stockfish-19-lite-single.wasm?url";

export type EngineEvaluation = {
  depth: number;
  scoreCp: number | null;
  mateIn: number | null;
  bestMove: string | null;
  principalVariation: string[];
};

type AnalysisRequest = {
  fen: string;
  depth: number;
  skillLevel: number;
  resolve: (value: EngineEvaluation) => void;
  reject: (reason?: unknown) => void;
};

type ActiveAnalysis = AnalysisRequest & {
  sideToMove: "w" | "b";
  evaluation: EngineEvaluation;
  superseded: boolean;
};

let worker: Worker | null = null;
let workerUrl: string | null = null;
let readyPromise: Promise<void> | null = null;
let readyResolve: (() => void) | null = null;
let readyReject: ((reason?: unknown) => void) | null = null;
let active: ActiveAnalysis | null = null;
let queued: AnalysisRequest | null = null;

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
  const source = [
    "self.Module = {",
    "  locateFile: function(path) {",
    `    return ${JSON.stringify(engineWasmUrl)};`,
    "  }",
    "};",
    `importScripts(${JSON.stringify(engineScriptUrl)});`
  ].join("\n");

  const blob = new Blob([source], { type: "application/javascript" });
  workerUrl = URL.createObjectURL(blob);
  return new Worker(workerUrl);
}

function startAnalysis(request: AnalysisRequest) {
  if (!worker) {
    request.reject(new Error("Stockfish worker is unavailable."));
    return;
  }

  const sideToMove = request.fen.split(/\s+/)[1] === "b" ? "b" : "w";
  active = {
    ...request,
    sideToMove,
    superseded: false,
    evaluation: {
      depth: 0,
      scoreCp: null,
      mateIn: null,
      bestMove: null,
      principalVariation: []
    }
  };

  worker.postMessage(`setoption name Skill Level value ${request.skillLevel}`);
  worker.postMessage("position fen " + request.fen);
  worker.postMessage(`go depth ${request.depth}`);
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

        if (!line.startsWith("bestmove ")) return;

        const finished = active;
        active = null;

        if (!finished.superseded) {
          finished.evaluation.bestMove = line.split(/\s+/)[1] ?? null;
          finished.resolve(finished.evaluation);
        }

        if (queued) {
          const next = queued;
          queued = null;
          startAnalysis(next);
        }
      });

      worker.addEventListener("error", event => {
        const error = event.error ?? new Error("Stockfish worker failed.");
        active?.reject(error);
        queued?.reject(error);
        active = null;
        queued = null;
        readyReject?.(error);
        readyResolve = null;
        readyReject = null;
        readyPromise = null;
        worker = null;
        if (workerUrl) {
          URL.revokeObjectURL(workerUrl);
          workerUrl = null;
        }
      });

      worker.postMessage("uci");
      worker.postMessage("isready");
    } catch (error) {
      readyPromise = null;
      readyResolve = null;
      readyReject = null;
      worker = null;
      if (workerUrl) {
        URL.revokeObjectURL(workerUrl);
        workerUrl = null;
      }
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

  const request: AnalysisRequest = {
    fen,
    depth: Math.max(6, Math.min(18, options.depth ?? 10)),
    skillLevel: Math.max(0, Math.min(20, options.skillLevel ?? 20)),
    resolve: () => undefined,
    reject: () => undefined
  };

  return new Promise((resolve, reject) => {
    request.resolve = resolve;
    request.reject = reject;

    if (active) {
      active.superseded = true;
      active.reject(new Error("Superseded by a newer analysis."));
      if (queued) {
        queued.reject(new Error("Superseded by a newer analysis."));
      }
      queued = request;
      worker?.postMessage("stop");
      return;
    }

    startAnalysis(request);
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
  active?.reject(new Error("Stockfish engine disposed."));
  queued?.reject(new Error("Stockfish engine disposed."));
  active = null;
  queued = null;
  worker?.terminate();
  worker = null;
  readyPromise = null;
  readyResolve = null;
  readyReject = null;
  if (workerUrl) {
    URL.revokeObjectURL(workerUrl);
    workerUrl = null;
  }
}
