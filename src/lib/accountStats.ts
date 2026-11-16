/**
 * Account Importer & Analytics Engine (Client-Side, Zero Backend)
 * - Verifies Lichess.org & Chess.com profiles
 * - Pages through Chess.com monthly archives (100 / 300 / 1000 depth)
 * - Streams Lichess NDJSON with `since` incremental sync support & proper `status` filtering
 * - Uses robust PGN/SAN parsing & flags incomplete games instead of silently dropping
 * - Splits "Openings You Play" vs "Openings You Face" and generates actionable insights
 */

import { Chess } from "chess.js";
import { parsePgnSafely } from "./chessUtils";
import { StoredAccountGame } from "./storage";

export type ImportDepth = 100 | 300 | 1000;

export interface AccountGameSummary {
  id: string;
  url?: string;
  opponent: string;
  opponentRating: number;
  userRating?: number;
  playerColor: "w" | "b";
  result: "W" | "L" | "D";
  termination: string;
  opening: string;
  eco: string;
  movesCount: number;
  date: string;
  playedAt: number;
  pgn: string;
  fen?: string;
  timeControl?: string;
  timeClass: "bullet" | "blitz" | "rapid" | "classical";
  rated: boolean;
  incomplete?: boolean;
}

export interface OpeningPerformance {
  key: string;
  name: string;
  eco: string;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  winPct: number;
  scorePct: number; // (wins + 0.5 * draws) / games
  playedAs: "white" | "black";
  role: "played" | "faced";
  fen?: string;
}

export interface ImprovementInsight {
  type: "warning" | "tip" | "praise";
  title: string;
  detail: string;
  actionLabel?: string;
  actionTarget?: {
    tab: "learn" | "train" | "play";
    courseId?: string;
    openingName?: string;
    fen?: string;
    color?: "w" | "b";
  };
}

export interface VerifiedAccountProfile {
  platform: "lichess" | "chess.com";
  username: string;
  title?: string;
  avatar?: string;
  ratings: {
    blitz?: number;
    rapid?: number;
    bullet?: number;
    classical?: number;
    puzzle?: number;
  };
}

export interface AccountAnalyticsSummary {
  totalGames: number;
  incompleteCount: number;
  wins: number;
  losses: number;
  draws: number;
  winPct: number;
  scorePct: number;
  colorStats: {
    white: { games: number; wins: number; losses: number; draws: number; winPct: number; scorePct: number };
    black: { games: number; wins: number; losses: number; draws: number; winPct: number; scorePct: number };
  };
  terminations: { label: string; count: number; pct: number }[];
  ratingTrend: { date: string; rating: number; timeClass: string }[];
  openingsPlayed: OpeningPerformance[];
  openingsFaced: OpeningPerformance[];
  insights: ImprovementInsight[];
}

export interface ImportProgressUpdate {
  imported: number;
  target: number;
  phase: string;
  incompleteCount: number;
}

export interface AccountReviewData {
  platform: "lichess" | "chess.com";
  username: string;
  title?: string;
  avatar?: string;
  ratings: VerifiedAccountProfile["ratings"];
  summary: {
    totalGames: number;
    wins: number;
    losses: number;
    draws: number;
    winPct: number;
    lossPct: number;
    drawPct: number;
  };
  colorStats: {
    white: { games: number; wins: number; losses: number; draws: number; winPct: number };
    black: { games: number; wins: number; losses: number; draws: number; winPct: number };
  };
  openings: OpeningPerformance[];
  improvementInsights: ImprovementInsight[];
  games: AccountGameSummary[];
}

export async function verifyAccountProfile(
  platform: "lichess" | "chess.com",
  username: string
): Promise<VerifiedAccountProfile> {
  const clean = username.trim().toLowerCase();
  if (!clean) throw new Error(`Please enter a ${platform === "lichess" ? "Lichess" : "Chess.com"} username.`);

  if (platform === "lichess") {
    const res = await fetch(`https://lichess.org/api/user/${encodeURIComponent(clean)}`, {
      signal: AbortSignal.timeout(7000)
    });
    if (!res.ok) {
      if (res.status === 404) throw new Error(`Lichess user "${username}" was not found.`);
      if (res.status === 429) throw new Error("Lichess rate limit reached. Please wait 45 seconds and try again.");
      throw new Error(`Could not load Lichess profile (HTTP ${res.status}).`);
    }
    const user = await res.json();
    if (user.closed || user.disabled) throw new Error(`Lichess account "${username}" is closed.`);
    return {
      platform: "lichess",
      username: user.username,
      title: user.title,
      ratings: {
        blitz: user.perfs?.blitz?.rating,
        rapid: user.perfs?.rapid?.rating,
        bullet: user.perfs?.bullet?.rating,
        classical: user.perfs?.classical?.rating,
        puzzle: user.perfs?.puzzle?.rating
      }
    };
  }

  // Chess.com
  const res = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(clean)}`, {
    signal: AbortSignal.timeout(7000)
  });
  if (!res.ok) {
    if (res.status === 404) throw new Error(`Chess.com player "${username}" was not found.`);
    if (res.status === 429) throw new Error("Chess.com rate limit reached. Please wait a moment and try again.");
    throw new Error(`Could not load Chess.com profile (HTTP ${res.status}).`);
  }
  const user = await res.json();

  let stats: Record<string, any> = {};
  try {
    const statsRes = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(clean)}/stats`, {
      signal: AbortSignal.timeout(6000)
    });
    if (statsRes.ok) stats = await statsRes.json();
  } catch {
    // stats optional
  }

  return {
    platform: "chess.com",
    username: user.username,
    title: user.title,
    avatar: user.avatar,
    ratings: {
      blitz: stats.chess_blitz?.last?.rating,
      rapid: stats.chess_rapid?.last?.rating,
      bullet: stats.chess_bullet?.last?.rating,
      classical: stats.chess_daily?.last?.rating,
      puzzle: stats.tactics?.highest?.rating
    }
  };
}

export async function importAccountGames(
  platform: "lichess" | "chess.com",
  username: string,
  options: {
    depth: ImportDepth;
    sinceTimestamp?: number;
    signal?: AbortSignal;
    onProgress?: (progress: ImportProgressUpdate) => void;
  }
): Promise<{ profile: VerifiedAccountProfile; games: StoredAccountGame[]; incompleteCount: number }> {
  const clean = username.trim().toLowerCase();
  const profile = await verifyAccountProfile(platform, clean);

  if (platform === "lichess") {
    return importLichessGames(profile, clean, options);
  }
  return importChessComGames(profile, clean, options);
}

async function importLichessGames(
  profile: VerifiedAccountProfile,
  clean: string,
  options: {
    depth: ImportDepth;
    sinceTimestamp?: number;
    signal?: AbortSignal;
    onProgress?: (progress: ImportProgressUpdate) => void;
  }
): Promise<{ profile: VerifiedAccountProfile; games: StoredAccountGame[]; incompleteCount: number }> {
  const url = new URL(`https://lichess.org/api/games/user/${encodeURIComponent(clean)}`);
  url.searchParams.set("max", String(options.depth));
  url.searchParams.set("moves", "true");
  url.searchParams.set("opening", "true");
  url.searchParams.set("pgnInJson", "true");
  url.searchParams.set("perfType", "bullet,blitz,rapid,classical,correspondence");
  if (options.sinceTimestamp) {
    url.searchParams.set("since", String(options.sinceTimestamp));
  }

  options.onProgress?.({ imported: 0, target: options.depth, phase: "Connecting to Lichess stream…", incompleteCount: 0 });

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/x-ndjson" },
    signal: options.signal ?? AbortSignal.timeout(45000)
  });

  if (!res.ok) {
    if (res.status === 429) throw new Error("Lichess asked us to slow down (HTTP 429). Wait 45s and retry.");
    throw new Error(`Lichess game export failed (HTTP ${res.status}).`);
  }

  const games: StoredAccountGame[] = [];
  let incompleteCount = 0;
  const abortedStatuses = new Set(["aborted", "noStart", "unknownFinish"]);

  const processLine = (line: string) => {
    if (!line.trim()) return;
    try {
      const g = JSON.parse(line);
      if (g.variant && g.variant !== "standard") return;
      if (abortedStatuses.has(g.status) && !g.winner) return;

      const isWhite = g.players?.white?.user?.id?.toLowerCase() === clean;
      const isBlack = g.players?.black?.user?.id?.toLowerCase() === clean;
      if (!isWhite && !isBlack) return;

      const userColor: "w" | "b" = isWhite ? "w" : "b";
      const opponent = isWhite
        ? (g.players?.black?.user?.name || "Anonymous")
        : (g.players?.white?.user?.name || "Anonymous");
      const opponentRating = isWhite
        ? (g.players?.black?.rating || 1500)
        : (g.players?.white?.rating || 1500);
      const userRating = isWhite ? g.players?.white?.rating : g.players?.black?.rating;

      let result: "W" | "L" | "D" = "D";
      if (g.winner === "white") result = isWhite ? "W" : "L";
      else if (g.winner === "black") result = isBlack ? "W" : "L";
      else if (["stalemate", "draw", "outoftime"].includes(g.status)) result = "D";
      else if (!g.winner && g.status !== "draw" && g.status !== "stalemate") return; // skip unresolved

      const termination = mapLichessTermination(g.status);
      const eco = g.opening?.eco || "A00";
      const openingName = g.opening?.name || deriveOpeningNameFromMoves(g.moves);
      const pgnText = g.pgn || formatPgnFromMoves(g.moves, isWhite ? profile.username : opponent, isWhite ? opponent : profile.username, result);
      const parsed = parsePgnSafely(pgnText);
      if (parsed.incomplete) incompleteCount++;

      const playedAt = typeof g.createdAt === "number" ? g.createdAt : Date.now();
      const timeClass = normalizeTimeClass(g.speed);

      games.push({
        id: `lichess:${g.id}`,
        source: "lichess",
        externalId: g.id,
        platform: "lichess",
        accountUsername: profile.username,
        rated: Boolean(g.rated),
        opponent,
        rating: opponentRating,
        userRating,
        playerColor: userColor,
        userColor,
        result,
        termination,
        timeClass,
        timeControl: g.clock ? `${Math.round(g.clock.initial / 60)}+${g.clock.increment}` : g.speed,
        date: new Date(playedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        playedAt,
        opening: openingName,
        eco,
        openingEco: eco,
        openingPlayedSide: userColor === "w" ? "white" : "black",
        moves: parsed.moves.length ? Math.ceil(parsed.moves.length / 2) : (g.moves ? Math.ceil(g.moves.trim().split(/\s+/).length / 2) : 0),
        pgn: pgnText,
        incomplete: parsed.incomplete,
        url: `https://lichess.org/${g.id}`
      });
    } catch {
      incompleteCount++;
    }
  };

  if (res.body && typeof res.body.getReader === "function") {
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        processLine(line);
      }
      options.onProgress?.({
        imported: games.length,
        target: options.depth,
        phase: `Streaming Lichess games (${games.length} imported)…`,
        incompleteCount
      });
    }
    if (buffer.trim()) processLine(buffer);
  } else {
    const text = await res.text();
    for (const line of text.split("\n")) {
      processLine(line);
    }
  }

  options.onProgress?.({
    imported: games.length,
    target: games.length,
    phase: `Imported ${games.length} Lichess games`,
    incompleteCount
  });

  return { profile, games, incompleteCount };
}

async function importChessComGames(
  profile: VerifiedAccountProfile,
  clean: string,
  options: {
    depth: ImportDepth;
    sinceTimestamp?: number;
    signal?: AbortSignal;
    onProgress?: (progress: ImportProgressUpdate) => void;
  }
): Promise<{ profile: VerifiedAccountProfile; games: StoredAccountGame[]; incompleteCount: number }> {
  options.onProgress?.({ imported: 0, target: options.depth, phase: "Loading Chess.com archive list…", incompleteCount: 0 });

  const arcRes = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(clean)}/games/archives`, {
    signal: options.signal ?? AbortSignal.timeout(10000)
  });

  if (!arcRes.ok) {
    if (arcRes.status === 429) throw new Error("Chess.com rate limit reached. Wait a moment and retry.");
    throw new Error(`Failed to fetch Chess.com archives (HTTP ${arcRes.status}).`);
  }

  const arcData = await arcRes.json();
  const archives: string[] = Array.isArray(arcData.archives) ? arcData.archives : [];
  const games: StoredAccountGame[] = [];
  let incompleteCount = 0;

  // Iterate newest -> oldest monthly archive until depth or sinceTimestamp reached
  for (let idx = archives.length - 1; idx >= 0; idx--) {
    if (options.signal?.aborted) break;
    if (games.length >= options.depth) break;

    const archiveUrl = archives[idx];
    const parts = archiveUrl.split("/");
    const label = parts.length >= 2 ? `${parts[parts.length - 2]}-${parts[parts.length - 1]}` : "archive";

    options.onProgress?.({
      imported: games.length,
      target: options.depth,
      phase: `Fetching ${label} (${games.length} imported)…`,
      incompleteCount
    });

    const mRes = await fetch(archiveUrl, { signal: options.signal ?? AbortSignal.timeout(15000) });
    if (mRes.status === 429) {
      await new Promise(r => setTimeout(r, 1500));
      continue;
    }
    if (!mRes.ok) continue;

    const mData = await mRes.json();
    const monthGames: any[] = Array.isArray(mData.games) ? mData.games : [];

    // Reverse chronological within the month
    for (let j = monthGames.length - 1; j >= 0; j--) {
      if (games.length >= options.depth) break;
      const g = monthGames[j];
      if (g.rules && g.rules !== "chess") continue;

      const playedAtMs = typeof g.end_time === "number" ? g.end_time * 1000 : Date.now();
      if (options.sinceTimestamp && playedAtMs <= options.sinceTimestamp) {
        idx = -1; // stop paging older months
        break;
      }

      const isWhite = g.white?.username?.toLowerCase() === clean;
      const isBlack = g.black?.username?.toLowerCase() === clean;
      if (!isWhite && !isBlack) continue;

      const userColor: "w" | "b" = isWhite ? "w" : "b";
      const opponent = isWhite ? (g.black?.username || "Opponent") : (g.white?.username || "Opponent");
      const opponentRating = isWhite ? (g.black?.rating || 1500) : (g.white?.rating || 1500);
      const userRating = isWhite ? g.white?.rating : g.black?.rating;

      const myCode = isWhite ? g.white?.result : g.black?.result;
      const oppCode = isWhite ? g.black?.result : g.white?.result;
      const { result, termination } = mapChessComResult(myCode, oppCode);

      const pgn = g.pgn || "";
      const ecoMatch = pgn.match(/\[ECO "(.*?)"\]/);
      const eco = ecoMatch ? ecoMatch[1] : "A00";
      const openingUrlMatch = pgn.match(/\[ECOUrl "https:\/\/www\.chess\.com\/openings\/(.*?)"\]/);
      let openingName = "Standard Chess";
      if (openingUrlMatch) {
        openingName = openingUrlMatch[1]
          .split("...")[0]
          .replace(/-\d+.*$/, "")
          .replace(/-/g, " ")
          .replace(/\b\w/g, (l: string) => l.toUpperCase())
          .trim() || "Standard Chess";
      } else {
        openingName = deriveOpeningFromPgn(pgn);
      }

      const parsed = parsePgnSafely(pgn);
      if (pgn && parsed.incomplete) incompleteCount++;

      const extId = g.url ? g.url.split("/").pop() || `${playedAtMs}-${j}` : `${playedAtMs}-${j}`;
      const timeClass = normalizeTimeClass(g.time_class);

      games.push({
        id: `chess.com:${extId}`,
        source: "chess.com",
        externalId: extId,
        platform: "chess.com",
        accountUsername: profile.username,
        rated: Boolean(g.rated),
        opponent,
        rating: opponentRating,
        userRating,
        playerColor: userColor,
        userColor,
        result,
        termination,
        timeClass,
        timeControl: g.time_control,
        date: new Date(playedAtMs).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        playedAt: playedAtMs,
        opening: openingName,
        eco,
        openingEco: eco,
        openingPlayedSide: userColor === "w" ? "white" : "black",
        moves: Math.ceil(parsed.moves.length / 2),
        pgn,
        incomplete: parsed.incomplete,
        url: g.url
      });
    }
  }

  options.onProgress?.({
    imported: games.length,
    target: games.length,
    phase: `Imported ${games.length} Chess.com games`,
    incompleteCount
  });

  return { profile, games, incompleteCount };
}

/**
 * Computes comprehensive dashboard analytics strictly from imported account games (never bot games).
 */
export function computeAccountAnalytics(
  games: StoredAccountGame[],
  filters: {
    timeframe: "all" | "30d" | "90d";
    timeClass: "all" | "bullet" | "blitz" | "rapid" | "classical";
    color: "all" | "white" | "black";
  }
): AccountAnalyticsSummary {
  const now = Date.now();
  const cutoff =
    filters.timeframe === "30d"
      ? now - 30 * 86400000
      : filters.timeframe === "90d"
      ? now - 90 * 86400000
      : 0;

  const filtered = games.filter(g => {
    if (cutoff && (g.playedAt ?? 0) < cutoff) return false;
    if (filters.timeClass !== "all" && g.timeClass !== filters.timeClass) return false;
    if (filters.color === "white" && g.userColor !== "w") return false;
    if (filters.color === "black" && g.userColor !== "b") return false;
    return true;
  });

  let wWins = 0, wLosses = 0, wDraws = 0;
  let bWins = 0, bLosses = 0, bDraws = 0;
  let incompleteCount = 0;

  const termCounts = new Map<string, number>();
  const playedMap = new Map<string, { name: string; eco: string; side: "white" | "black"; wins: number; losses: number; draws: number; fen?: string }>();
  const facedMap = new Map<string, { name: string; eco: string; side: "white" | "black"; wins: number; losses: number; draws: number; fen?: string }>();

  for (const g of filtered) {
    if (g.incomplete) incompleteCount++;
    const term = g.termination || "Other";
    termCounts.set(term, (termCounts.get(term) ?? 0) + 1);

    if (g.userColor === "w") {
      if (g.result === "W") wWins++;
      else if (g.result === "L") wLosses++;
      else wDraws++;
    } else {
      if (g.result === "W") bWins++;
      else if (g.result === "L") bLosses++;
      else bDraws++;
    }

    // Separate "Openings You Play" vs "Openings You Face" clearly:
    // White openings (e.g. Italian, London, Ruy Lopez, Queen's Gambit) are played by White and faced by Black.
    // Black defenses (Sicilian, French, Caro-Kann, King's Indian, Pirc, Scandinavian, Slav) are played by Black and faced by White.
    const isBlackDefenseName = /defense|sicilian|caro-kann|french|indian|scandinavian|slav|pirc|alekhine|modern|philidor|petrov|dutch|benoni/i.test(g.opening);
    const role: "played" | "faced" =
      g.userColor === "w"
        ? (isBlackDefenseName ? "faced" : "played")
        : (isBlackDefenseName ? "played" : "faced");

    const targetMap = role === "played" ? playedMap : facedMap;
    const side: "white" | "black" = g.userColor === "w" ? "white" : "black";
    const key = `${side}:${g.opening}`;
    const bucket = targetMap.get(key) ?? {
      name: g.opening,
      eco: g.openingEco || "A00",
      side,
      wins: 0,
      losses: 0,
      draws: 0,
      fen: undefined as string | undefined
    };

    if (g.result === "W") bucket.wins++;
    else if (g.result === "L") bucket.losses++;
    else bucket.draws++;

    if (!bucket.fen && g.pgn) {
      const parsed = parsePgnSafely(g.pgn);
      if (parsed.moves.length) {
        const preview = new Chess(parsed.startFen);
        try {
          for (let i = 0; i < Math.min(8, parsed.moves.length); i++) {
            preview.move(parsed.moves[i].san);
          }
        } catch {
          // keep the position reached so far
        }
        bucket.fen = preview.fen();
      }
    }
    targetMap.set(key, bucket);
  }

  const toOpeningList = (map: typeof playedMap, role: "played" | "faced"): OpeningPerformance[] =>
    Array.from(map.entries())
      .map(([key, o]) => {
        const total = o.wins + o.losses + o.draws;
        return {
          key,
          name: o.name,
          eco: o.eco,
          games: total,
          wins: o.wins,
          losses: o.losses,
          draws: o.draws,
          winPct: total > 0 ? Math.round((o.wins / total) * 100) : 0,
          scorePct: total > 0 ? Math.round(((o.wins + o.draws * 0.5) / total) * 100) : 0,
          playedAs: o.side,
          role,
          fen: o.fen
        };
      })
      .sort((a, b) => b.games - a.games);

  const openingsPlayed = toOpeningList(playedMap, "played");
  const openingsFaced = toOpeningList(facedMap, "faced");

  const wTotal = wWins + wLosses + wDraws;
  const bTotal = bWins + bLosses + bDraws;
  const totalGames = filtered.length;
  const wins = wWins + bWins;
  const losses = wLosses + bLosses;
  const draws = wDraws + bDraws;
  const denom = totalGames || 1;

  const ratingTrend = [...filtered]
    .filter(g => typeof g.userRating === "number" && g.userRating > 0)
    .sort((a, b) => (a.playedAt ?? 0) - (b.playedAt ?? 0))
    .slice(-40)
    .map(g => ({
      date: g.date,
      rating: g.userRating as number,
      timeClass: g.timeClass || "rapid"
    }));

  const terminations = Array.from(termCounts.entries())
    .map(([label, count]) => ({
      label,
      count,
      pct: Math.round((count / denom) * 100)
    }))
    .sort((a, b) => b.count - a.count);

  const wWinPct = wTotal ? Math.round((wWins / wTotal) * 100) : 0;
  const wScorePct = wTotal ? Math.round(((wWins + wDraws * 0.5) / wTotal) * 100) : 0;
  const bWinPct = bTotal ? Math.round((bWins / bTotal) * 100) : 0;
  const bScorePct = bTotal ? Math.round(((bWins + bDraws * 0.5) / bTotal) * 100) : 0;

  const insights = buildDashboardInsights({
    totalGames,
    wTotal,
    bTotal,
    wScorePct,
    bScorePct,
    terminations,
    openingsPlayed,
    openingsFaced
  });

  return {
    totalGames,
    incompleteCount,
    wins,
    losses,
    draws,
    winPct: Math.round((wins / denom) * 100),
    scorePct: Math.round(((wins + draws * 0.5) / denom) * 100),
    colorStats: {
      white: { games: wTotal, wins: wWins, losses: wLosses, draws: wDraws, winPct: wWinPct, scorePct: wScorePct },
      black: { games: bTotal, wins: bWins, losses: bLosses, draws: bDraws, winPct: bWinPct, scorePct: bScorePct }
    },
    terminations,
    ratingTrend,
    openingsPlayed,
    openingsFaced,
    insights
  };
}

function buildDashboardInsights(data: {
  totalGames: number;
  wTotal: number;
  bTotal: number;
  wScorePct: number;
  bScorePct: number;
  terminations: { label: string; count: number; pct: number }[];
  openingsPlayed: OpeningPerformance[];
  openingsFaced: OpeningPerformance[];
}): ImprovementInsight[] {
  const insights: ImprovementInsight[] = [];
  if (data.totalGames === 0) return insights;

  const weakFaced = data.openingsFaced.filter(o => o.games >= 3 && o.scorePct < 45).sort((a, b) => a.scorePct - b.scorePct)[0];
  if (weakFaced) {
    insights.push({
      type: "warning",
      title: `As ${weakFaced.playedAs === "white" ? "White" : "Black"} vs ${weakFaced.name}: ${weakFaced.scorePct}% score`,
      detail: `Across ${weakFaced.games} games (${weakFaced.wins}W · ${weakFaced.draws}D · ${weakFaced.losses}L), this matchup is your biggest rating leak.`,
      actionLabel: "Practise this line",
      actionTarget: {
        tab: "play",
        openingName: weakFaced.name,
        color: weakFaced.playedAs === "white" ? "w" : "b"
      }
    });
  }

  const weakPlayed = data.openingsPlayed.filter(o => o.games >= 3 && o.scorePct < 45).sort((a, b) => a.scorePct - b.scorePct)[0];
  if (weakPlayed) {
    insights.push({
      type: "warning",
      title: `Low conversion in ${weakPlayed.name} (${weakPlayed.playedAs === "white" ? "White" : "Black"}): ${weakPlayed.scorePct}%`,
      detail: `Review the core plans and middlegame ideas across your ${weakPlayed.games} games in this setup.`,
      actionLabel: "Study openings",
      actionTarget: {
        tab: "learn",
        courseId: "openings",
        fen: weakPlayed.fen
      }
    });
  }

  const timeoutEntry = data.terminations.find(t => t.label === "Timeout");
  if (timeoutEntry && timeoutEntry.pct >= 18) {
    insights.push({
      type: "tip",
      title: `${timeoutEntry.pct}% of games end on time`,
      detail: `Speed up pattern recognition on forcing checks and tactical motifs so you spend less clock in sharp positions.`,
      actionLabel: "Drill tactics",
      actionTarget: { tab: "train", courseId: "tactics" }
    });
  }

  if (data.bTotal >= 5 && data.wTotal >= 5 && data.wScorePct - data.bScorePct >= 14) {
    insights.push({
      type: "tip",
      title: `Black score trails White (${data.bScorePct}% vs ${data.wScorePct}%)`,
      detail: "Build a reliable response against both 1.e4 and 1.d4 to stabilize your results with Black.",
      actionLabel: "Openings course",
      actionTarget: { tab: "learn", courseId: "openings" }
    });
  }

  const bestPlayed = data.openingsPlayed.filter(o => o.games >= 3 && o.scorePct >= 60).sort((a, b) => b.scorePct - a.scorePct)[0];
  if (bestPlayed) {
    insights.push({
      type: "praise",
      title: `Reliable weapon: ${bestPlayed.name} (${bestPlayed.scorePct}% over ${bestPlayed.games} games)`,
      detail: `Keep steering opponents into this structure—your results here consistently outperform your average.`,
      actionLabel: "Explore in DB",
      actionTarget: { tab: "learn", fen: bestPlayed.fen }
    });
  }

  return insights.slice(0, 4);
}

function normalizeTimeClass(raw?: string): "bullet" | "blitz" | "rapid" | "classical" {
  const val = (raw || "").toLowerCase();
  if (val.includes("bullet") || val === "ultrabullet") return "bullet";
  if (val.includes("blitz")) return "blitz";
  if (val.includes("rapid")) return "rapid";
  return "classical";
}

function mapLichessTermination(status?: string): string {
  switch (status) {
    case "mate":
      return "Checkmate";
    case "resign":
      return "Resignation";
    case "outoftime":
      return "Timeout";
    case "stalemate":
      return "Stalemate";
    case "draw":
      return "Draw";
    default:
      return "Finished";
  }
}

function mapChessComResult(myCode?: string, oppCode?: string): { result: "W" | "L" | "D"; termination: string } {
  if (myCode === "win") {
    if (oppCode === "checkmated") return { result: "W", termination: "Checkmate" };
    if (oppCode === "resigned") return { result: "W", termination: "Resignation" };
    if (oppCode === "timeout") return { result: "W", termination: "Timeout" };
    return { result: "W", termination: "Win" };
  }
  if (["checkmated", "resigned", "timeout", "abandoned", "lose"].includes(myCode || "")) {
    if (myCode === "checkmated") return { result: "L", termination: "Checkmate" };
    if (myCode === "resigned") return { result: "L", termination: "Resignation" };
    if (myCode === "timeout") return { result: "L", termination: "Timeout" };
    return { result: "L", termination: "Loss" };
  }
  if (myCode === "stalemate") return { result: "D", termination: "Stalemate" };
  return { result: "D", termination: "Draw" };
}

function deriveOpeningNameFromMoves(movesStr?: string): string {
  if (!movesStr) return "Open Game";
  const first = movesStr.trim().split(/\s+/).slice(0, 6).join(" ");
  if (first.startsWith("e4 c5")) return "Sicilian Defense";
  if (first.startsWith("e4 e5 Nf3 Nc6 Bc4")) return "Italian Game";
  if (first.startsWith("e4 e5 Nf3 Nc6 Bb5")) return "Ruy Lopez";
  if (first.startsWith("e4 e6")) return "French Defense";
  if (first.startsWith("e4 c6")) return "Caro-Kann Defense";
  if (first.startsWith("d4 d5 c4")) return "Queen's Gambit";
  if (first.startsWith("d4 d5 Bf4")) return "London System";
  if (first.startsWith("d4 Nf6 c4 g6")) return "King's Indian Defense";
  if (first.startsWith("c4")) return "English Opening";
  if (first.startsWith("Nf3")) return "Réti Opening";
  return "Standard Opening";
}

function deriveOpeningFromPgn(pgn: string): string {
  if (pgn.includes("1. e4 c5")) return "Sicilian Defense";
  if (pgn.includes("1. e4 e5 2. Nf3 Nc6 3. Bc4")) return "Italian Game";
  if (pgn.includes("1. e4 e5 2. Nf3 Nc6 3. Bb5")) return "Ruy Lopez";
  if (pgn.includes("1. e4 e6")) return "French Defense";
  if (pgn.includes("1. e4 c6")) return "Caro-Kann Defense";
  if (pgn.includes("1. d4 d5 2. c4")) return "Queen's Gambit";
  if (pgn.includes("1. d4 d5 2. Bf4")) return "London System";
  if (pgn.includes("1. d4 Nf6 2. c4 g6")) return "King's Indian Defense";
  if (pgn.includes("1. c4")) return "English Opening";
  return "Chess Opening";
}

function formatPgnFromMoves(movesStr: string | undefined, white: string, black: string, result: string): string {
  const resStr = result === "W" ? "1-0" : result === "L" ? "0-1" : "1/2-1/2";
  return `[White "${white}"]\n[Black "${black}"]\n[Result "${resStr}"]\n\n${movesStr || ""} ${resStr}`;
}
