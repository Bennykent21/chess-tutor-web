/**
 * Lichess API Client & Opening Database Connector
 * Integrates:
 * - Lichess Opening Explorer (Masters & Community games with win rates, moves, master games)
 * - Lichess Syzygy 7-Piece Endgame Tablebases
 * - Lichess Player Database, ratings, and game archives
 * - Lichess Daily Puzzles & TV broadcasts
 */

import { CandidateMove, MasterGame, OpeningStats, getLocalOpeningStats } from "../data/openingsDatabase";

const LICHESS_TOKEN_KEY = "lichess_personal_access_token";

export function getLichessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(LICHESS_TOKEN_KEY);
}

export function setLichessToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (!token) {
    localStorage.removeItem(LICHESS_TOKEN_KEY);
  } else {
    localStorage.setItem(LICHESS_TOKEN_KEY, token.trim());
  }
}

export interface LichessExplorerParams {
  fen: string;
  source?: "lichess" | "masters" | "player";
  player?: string;
  color?: "white" | "black";
  speeds?: string[]; // "blitz", "rapid", "classical", etc.
  ratings?: number[]; // [1600, 1800, 2000, 2200, 2500]
  moves?: number;
  topGames?: number;
  recentGames?: number;
}

export interface LichessTablebaseMove {
  uci: string;
  san: string;
  category: "win" | "unknown" | "draw" | "loss";
  dtm?: number | null;
  dtz?: number | null;
  checkmate?: boolean;
  stalemate?: boolean;
}

export interface LichessTablebaseResult {
  category: "win" | "unknown" | "draw" | "loss";
  dtm?: number | null;
  dtz?: number | null;
  checkmate?: boolean;
  stalemate?: boolean;
  moves: LichessTablebaseMove[];
}

export interface LichessUserProfile {
  id: string;
  username: string;
  title?: string;
  online?: boolean;
  perfs?: {
    blitz?: { rating: number; games: number; prog: number };
    rapid?: { rating: number; games: number; prog: number };
    bullet?: { rating: number; games: number; prog: number };
    classical?: { rating: number; games: number; prog: number };
    puzzle?: { rating: number; games: number; prog: number };
  };
  count?: {
    all: number;
    rated: number;
    win: number;
    loss: number;
    draw: number;
  };
  url: string;
}

export interface LichessGameItem {
  id: string;
  speed: string;
  rated: boolean;
  winner?: "white" | "black" | "draw";
  status: string;
  createdAt: number;
  players: {
    white: { user?: { name: string; title?: string }; rating?: number };
    black: { user?: { name: string; title?: string }; rating?: number };
  };
  moves?: string;
  opening?: { eco: string; name: string };
}

export interface LichessDailyPuzzle {
  id: string;
  rating: number;
  themes: string[];
  initialPly: number;
  fen: string;
  moves: string[]; // solution moves in UCI
  pgn: string;
}

export interface ExplorerResponse {
  stats: OpeningStats;
  source: "lichess-api" | "masters-api" | "local-database";
  online: boolean;
}

/**
 * Fetch opening stats from Lichess Opening Explorer.
 * If token is not provided or network request fails (e.g. 401 without token),
 * seamlessly returns stats from our rich built-in Lichess & Master database.
 */
export async function fetchLichessOpeningStats(params: LichessExplorerParams): Promise<ExplorerResponse> {
  const token = getLichessToken();
  const endpoint = params.source === "masters" ? "masters" : "lichess";
  const url = new URL(`https://explorer.lichess.ovh/${endpoint}`);
  url.searchParams.set("fen", params.fen);
  url.searchParams.set("moves", String(params.moves || 12));
  url.searchParams.set("topGames", String(params.topGames || 5));
  url.searchParams.set("recentGames", String(params.recentGames || 4));

  if (params.speeds && params.speeds.length > 0 && endpoint === "lichess") {
    url.searchParams.set("speeds", params.speeds.join(","));
  }
  if (params.ratings && params.ratings.length > 0 && endpoint === "lichess") {
    url.searchParams.set("ratings", params.ratings.join(","));
  }

  const headers: Record<string, string> = {
    Accept: "application/json"
  };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const res = await fetch(url.toString(), {
      headers,
      signal: AbortSignal.timeout(4000)
    });

    if (res.ok) {
      const data = await res.json();
      const white = Number(data.white || 0);
      const draws = Number(data.draws || 0);
      const black = Number(data.black || 0);
      const total = white + draws + black;

      const moves: CandidateMove[] = (data.moves || []).map((m: any) => {
        const mw = Number(m.white || 0);
        const md = Number(m.draws || 0);
        const mb = Number(m.black || 0);
        const mTotal = mw + md + mb;
        return {
          san: m.san,
          uci: m.uci,
          white: mw,
          draws: md,
          black: mb,
          totalGames: mTotal,
          whiteWinPct: mTotal > 0 ? Math.round((mw / mTotal) * 100) : 0,
          drawPct: mTotal > 0 ? Math.round((md / mTotal) * 100) : 0,
          blackWinPct: mTotal > 0 ? Math.round((mb / mTotal) * 100) : 0,
          averageRating: m.averageRating,
          performance: m.performance
        };
      });

      const topGames: MasterGame[] = (data.topGames || []).map((g: any) => ({
        id: g.id,
        white: { name: g.white?.name || "White", rating: g.white?.rating || 0, title: g.white?.title },
        black: { name: g.black?.name || "Black", rating: g.black?.rating || 0, title: g.black?.title },
        year: g.year || new Date().getFullYear(),
        winner: g.winner || "draw",
        month: g.month
      }));

      const stats: OpeningStats = {
        fen: params.fen,
        eco: data.opening?.eco || "A00",
        name: data.opening?.name || "Unclassified Opening",
        totalGames: total,
        white,
        draws,
        black,
        whiteWinPct: total > 0 ? Math.round((white / total) * 100) : 0,
        drawPct: total > 0 ? Math.round((draws / total) * 100) : 0,
        blackWinPct: total > 0 ? Math.round((black / total) * 100) : 0,
        moves,
        topGames
      };

      return {
        stats,
        source: params.source === "masters" ? "masters-api" : "lichess-api",
        online: true
      };
    }
  } catch (_e) {
    // Graceful fallback to local opening book
  }

  // Fallback to rich bundled Lichess openings database
  const local = getLocalOpeningStats(params.fen);
  if (local) {
    return { stats: local, source: "local-database", online: false };
  }

  // Synthesize sensible default
  return {
    stats: {
      fen: params.fen,
      eco: "—",
      name: "Out of Lichess Opening Book",
      totalGames: 0,
      white: 0,
      draws: 0,
      black: 0,
      whiteWinPct: 0,
      drawPct: 0,
      blackWinPct: 0,
      moves: []
    },
    source: "local-database",
    online: false
  };
}

/**
 * Syzygy 7-piece tablebase query (public, no authentication needed)
 */
export async function fetchLichessTablebase(fen: string): Promise<LichessTablebaseResult | null> {
  const placement = fen.split(" ")[0];
  let pieceCount = 0;
  for (const char of placement) {
    if (/[pnbrqkPNBRQK]/.test(char)) {
      pieceCount++;
    }
  }
  if (pieceCount > 7) {
    return null;
  }

  try {
    const url = `https://tablebase.lichess.ovh/standard?fen=${encodeURIComponent(fen)}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(3500) });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      category: data.category || "unknown",
      dtm: data.dtm,
      dtz: data.dtz,
      checkmate: data.checkmate,
      stalemate: data.stalemate,
      moves: (data.moves || []).map((m: any) => ({
        uci: m.uci,
        san: m.san,
        category: m.category,
        dtm: m.dtm,
        dtz: m.dtz,
        checkmate: m.checkmate,
        stalemate: m.stalemate
      }))
    };
  } catch (_e) {
    return null;
  }
}

/**
 * Fetch public user profile from Lichess
 */
export async function fetchLichessUserProfile(username: string): Promise<LichessUserProfile | null> {
  const clean = username.trim().toLowerCase();
  if (!clean) return null;

  try {
    const res = await fetch(`https://lichess.org/api/user/${encodeURIComponent(clean)}`, {
      signal: AbortSignal.timeout(4000)
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      id: data.id,
      username: data.username,
      title: data.title,
      online: data.online,
      perfs: data.perfs,
      count: data.count,
      url: `https://lichess.org/@/${data.username}`
    };
  } catch (_e) {
    return null;
  }
}

/**
 * Fetch user's recent games from Lichess (NDJSON format)
 */
export async function fetchLichessUserGames(username: string, max = 8): Promise<LichessGameItem[]> {
  const clean = username.trim().toLowerCase();
  if (!clean) return [];

  try {
    const url = `https://lichess.org/api/games/user/${encodeURIComponent(clean)}?max=${max}&moves=true&opening=true`;
    const res = await fetch(url, {
      headers: { Accept: "application/x-ndjson" },
      signal: AbortSignal.timeout(6000)
    });
    if (!res.ok) return [];

    const text = await res.text();
    const lines = text.trim().split("\n");
    const games: LichessGameItem[] = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const item = JSON.parse(line);
        games.push({
          id: item.id,
          speed: item.speed || "blitz",
          rated: Boolean(item.rated),
          winner: item.winner,
          status: item.status,
          createdAt: item.createdAt,
          players: {
            white: {
              user: item.players?.white?.user,
              rating: item.players?.white?.rating
            },
            black: {
              user: item.players?.black?.user,
              rating: item.players?.black?.rating
            }
          },
          moves: item.moves,
          opening: item.opening
        });
      } catch (_parseErr) {
        // Skip malformed line
      }
    }
    return games;
  } catch (_e) {
    return [];
  }
}

/**
 * Fetch official daily puzzle from Lichess
 */
export async function fetchLichessDailyPuzzle(): Promise<LichessDailyPuzzle | null> {
  try {
    const res = await fetch("https://lichess.org/api/puzzle/daily", {
      signal: AbortSignal.timeout(4500)
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      id: data.puzzle?.id || "daily",
      rating: data.puzzle?.rating || 1500,
      themes: data.puzzle?.themes || [],
      initialPly: data.puzzle?.initialPly || 0,
      fen: data.game?.fen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
      moves: data.puzzle?.solution || [],
      pgn: data.game?.pgn || ""
    };
  } catch (_e) {
    return null;
  }
}

/**
 * Fetch game moves and details by Lichess Game ID or URL
 */
export async function fetchLichessGame(gameIdOrUrl: string): Promise<LichessGameItem | null> {
  let id = gameIdOrUrl.trim();
  const match = id.match(/lichess\.org\/([a-zA-Z0-9]{8})/);
  if (match) {
    id = match[1];
  } else if (id.length > 8) {
    id = id.slice(0, 8);
  }

  if (!/^[a-zA-Z0-9]{8}$/.test(id)) return null;

  try {
    const res = await fetch(`https://lichess.org/game/export/${id}?moves=true&opening=true`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(4500)
    });
    if (!res.ok) return null;
    const data = await res.json();
    return {
      id: data.id,
      speed: data.speed,
      rated: Boolean(data.rated),
      winner: data.winner,
      status: data.status,
      createdAt: data.createdAt,
      players: {
        white: { user: data.players?.white?.user, rating: data.players?.white?.rating },
        black: { user: data.players?.black?.user, rating: data.players?.black?.rating }
      },
      moves: data.moves,
      opening: data.opening
    };
  } catch (_e) {
    return null;
  }
}
