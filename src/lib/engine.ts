import engineScriptUrl from "stockfish/bin/stockfish-19-lite-single.js?url";
import engineWasmUrl from "stockfish/bin/stockfish-19-lite-single.wasm?url";

export type EngineEvaluation = {
  depth: number;
  scoreCp: number | null;
  mateIn: number | null;
  bestMove: string | null;
  principalVariation: string[];
  nps?: number;
  nodes?: number;
};

export type EngineLine = {
  multipv: number;
  depth: number;
  scoreCp: number | null; // White-perspective centipawns
  mateIn: number | null;  // White-perspective mate distance
  moves: string[];
  firstMove: string | null;
  nps?: number;
  nodes?: number;
};

type AnalysisRequest = {
  fen: string;
  depth?: number;
  movetimeMs?: number;
  lines: number;
  skillLevel: number;
  uciElo?: number;
  resolve: (value: EngineLine[]) => void;
  reject: (reason?: unknown) => void;
};

type ActiveAnalysis = AnalysisRequest & {
  sideToMove: "w" | "b";
  lineMap: Map<number, EngineLine>;
  superseded: boolean;
};

let worker: Worker | null = null;
let workerUrl: string | null = null;
let readyPromise: Promise<void> | null = null;
let readyResolve: (() => void) | null = null;
let readyReject: ((reason?: unknown) => void) | null = null;
let active: ActiveAnalysis | null = null;
let queued: AnalysisRequest | null = null;
let engineIdentity = "Stockfish 19 Lite WASM";

function parseMultiPvInfo(
  line: string,
  sideToMove: "w" | "b",
  lineMap: Map<number, EngineLine>
): void {
  const depthMatch = line.match(/\bdepth (\d+)/);
  const multipvMatch = line.match(/\bmultipv (\d+)/);
  const scoreMatch = line.match(/\bscore (cp|mate) (-?\d+)/);
  const pvMatch = line.match(/\bpv (.+)$/);
  const npsMatch = line.match(/\bnps (\d+)/);
  const nodesMatch = line.match(/\bnodes (\d+)/);

  if (!pvMatch && !scoreMatch) return;

  const multipv = multipvMatch ? Number(multipvMatch[1]) : 1;
  const prev = lineMap.get(multipv) ?? {
    multipv,
    depth: 0,
    scoreCp: null,
    mateIn: null,
    moves: [],
    firstMove: null
  };

  if (depthMatch) prev.depth = Number(depthMatch[1]);
  if (npsMatch) prev.nps = Number(npsMatch[1]);
  if (nodesMatch) prev.nodes = Number(nodesMatch[1]);

  if (scoreMatch) {
    const raw = Number(scoreMatch[2]);
    if (scoreMatch[1] === "cp") {
      prev.scoreCp = sideToMove === "w" ? raw : -raw;
      prev.mateIn = null;
    } else {
      prev.mateIn = sideToMove === "w" ? raw : -raw;
      prev.scoreCp = null;
    }
  }

  if (pvMatch) {
    const moves = pvMatch[1].trim().split(/\s+/).filter(Boolean);
    prev.moves = moves;
    prev.firstMove = moves[0] ?? null;
  }

  lineMap.set(multipv, prev);
}

function toAbsoluteUrl(url: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  if (typeof window !== "undefined" && window.location) {
    return new URL(url, window.location.href).href;
  }
  return url;
}

function createWorker(): Worker {
  const absScriptUrl = toAbsoluteUrl(engineScriptUrl);
  const absWasmUrl = toAbsoluteUrl(engineWasmUrl);
  const workerHash = `#${encodeURIComponent(absWasmUrl)},worker`;

  try {
    return new Worker(`${absScriptUrl}${workerHash}`);
  } catch {
    const source = [
      "self.Module = {",
      "  locateFile: function() {",
      `    return ${JSON.stringify(absWasmUrl)};`,
      "  }",
      "};",
      `importScripts(${JSON.stringify(absScriptUrl)});`
    ].join("\n");

    const blob = new Blob([source], { type: "application/javascript" });
    workerUrl = URL.createObjectURL(blob);
    return new Worker(`${workerUrl}${workerHash}`);
  }
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
    lineMap: new Map()
  };

  worker.postMessage(`setoption name MultiPV value ${Math.max(1, Math.min(5, request.lines))}`);
  if (typeof request.uciElo === "number" && request.uciElo >= 1320) {
    worker.postMessage("setoption name UCI_LimitStrength value true");
    worker.postMessage(`setoption name UCI_Elo value ${Math.min(3190, Math.round(request.uciElo))}`);
  } else {
    worker.postMessage("setoption name UCI_LimitStrength value false");
    worker.postMessage(`setoption name Skill Level value ${Math.max(0, Math.min(20, request.skillLevel))}`);
  }
  worker.postMessage("position fen " + request.fen);
  if (request.movetimeMs && request.movetimeMs > 0) {
    worker.postMessage(`go movetime ${Math.round(request.movetimeMs)}`);
  } else {
    worker.postMessage(`go depth ${request.depth ?? 10}`);
  }
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

        if (line.startsWith("id name ")) {
          engineIdentity = line.slice(8).trim() || engineIdentity;
          return;
        }

        if (line === "readyok") {
          readyResolve?.();
          readyResolve = null;
          readyReject = null;
          return;
        }

        if (!active) return;

        if (line.startsWith("info ")) {
          parseMultiPvInfo(line, active.sideToMove, active.lineMap);
          return;
        }

        if (!line.startsWith("bestmove ")) return;

        const finished = active;
        active = null;

        if (!finished.superseded) {
          const bestToken = line.split(/\s+/)[1] ?? null;
          const sorted = Array.from(finished.lineMap.values()).sort((a, b) => a.multipv - b.multipv);
          if (sorted.length === 0 && bestToken && bestToken !== "(none)") {
            sorted.push({
              multipv: 1,
              depth: finished.depth ?? 1,
              scoreCp: 0,
              mateIn: null,
              moves: [bestToken],
              firstMove: bestToken
            });
          } else if (sorted[0] && !sorted[0].firstMove && bestToken && bestToken !== "(none)") {
            sorted[0].firstMove = bestToken;
            if (!sorted[0].moves.length) sorted[0].moves = [bestToken];
          }
          finished.resolve(sorted);
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

export async function analyseMultiPV(
  fen: string,
  options: { depth?: number; movetimeMs?: number; lines?: number; skillLevel?: number; uciElo?: number } = {}
): Promise<EngineLine[]> {
  await ensureWorker();

  const request: AnalysisRequest = {
    fen,
    depth: options.movetimeMs ? undefined : Math.max(4, Math.min(20, options.depth ?? 12)),
    movetimeMs: options.movetimeMs,
    lines: Math.max(1, Math.min(5, options.lines ?? 1)),
    skillLevel: Math.max(0, Math.min(20, options.skillLevel ?? 20)),
    uciElo: options.uciElo,
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

export async function analysePosition(
  fen: string,
  options: { depth?: number; skillLevel?: number; movetimeMs?: number; uciElo?: number } = {}
): Promise<EngineEvaluation> {
  const lines = await analyseMultiPV(fen, { ...options, lines: 1 });
  const top = lines[0];
  return {
    depth: top?.depth ?? 0,
    scoreCp: top?.scoreCp ?? null,
    mateIn: top?.mateIn ?? null,
    bestMove: top?.firstMove ?? null,
    principalVariation: top?.moves ?? [],
    nps: top?.nps,
    nodes: top?.nodes
  };
}

export async function findBestMove(
  fen: string,
  options: { depth?: number; skillLevel?: number; movetimeMs?: number; uciElo?: number } = {}
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

export type EngineHealthReport = {
  ok: boolean;
  engineName: string;
  depth: number;
  bestMove: string | null;
  evalCp: number | null;
  nps: number | null;
  nodes: number | null;
  durationMs: number;
  linesCount: number;
  error?: string;
};

export async function runEngineHealthCheck(): Promise<EngineHealthReport> {
  const start = performance.now();
  try {
    const testFen = "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4";
    const lines = await analyseMultiPV(testFen, { depth: 10, lines: 2, skillLevel: 20 });
    const top = lines[0];
    const durationMs = Math.max(1, Math.round(performance.now() - start));
    const measuredNps = top?.nps ?? (top?.nodes ? Math.round((top.nodes * 1000) / durationMs) : null);
    return {
      ok: Boolean(top?.firstMove),
      engineName: engineIdentity,
      depth: top?.depth ?? 0,
      bestMove: top?.firstMove ?? null,
      evalCp: top?.scoreCp ?? null,
      nps: measuredNps,
      nodes: top?.nodes ?? null,
      durationMs,
      linesCount: lines.length
    };
  } catch (err: unknown) {
    return {
      ok: false,
      engineName: engineIdentity,
      depth: 0,
      bestMove: null,
      evalCp: null,
      nps: null,
      nodes: null,
      durationMs: Math.round(performance.now() - start),
      linesCount: 0,
      error: err instanceof Error ? err.message : "Engine worker failed to initialize."
    };
  }
}

export const runEngineSelfTest = runEngineHealthCheck;
