/**
 * Account Reviewer & Game Statistics Engine
 * Analyzes Lichess.org and Chess.com user accounts:
 * - Public API calls (no user token required)
 * - Win / Loss / Draw percentages overall and by color (White vs Black)
 * - Openings breakdown (games count, win rate, performance)
 * - "What to Improve" diagnostic statistics (weak openings, strategic weaknesses)
 * - Full game archive with PGN parsing and review loading
 */

import { Chess } from "chess.js";
import { getLocalOpeningStats } from "../data/openingsDatabase";

export interface AccountGameSummary {
  id: string;
  url?: string;
  opponent: string;
  opponentRating: number;
  playerColor: "w" | "b";
  result: "W" | "L" | "D";
  opening: string;
  eco: string;
  movesCount: number;
  date: string;
  pgn: string;
  fen?: string;
  timeControl?: string;
}

export interface OpeningPerformance {
  name: string;
  eco: string;
  games: number;
  wins: number;
  losses: number;
  draws: number;
  winPct: number;
  lossPct: number;
  drawPct: number;
  playedAs: "white" | "black" | "both";
  fen?: string;
}

export interface ImprovementInsight {
  type: "warning" | "tip" | "praise";
  title: string;
  detail: string;
  actionableOpening?: string;
  actionableFen?: string;
}

export interface AccountReviewData {
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
  weakOpenings: {
    name: string;
    eco: string;
    winPct: number;
    games: number;
    recommendation: string;
    fen?: string;
  }[];
  strongOpenings: {
    name: string;
    eco: string;
    winPct: number;
    games: number;
  }[];
  improvementInsights: ImprovementInsight[];
  games: AccountGameSummary[];
}

/**
 * Fetch and analyze Lichess account
 */
export async function fetchLichessAccountReview(username: string): Promise<AccountReviewData> {
  const clean = username.trim().toLowerCase();
  if (!clean) throw new Error("Please enter a Lichess username.");

  // 1. Fetch user profile
  const userRes = await fetch(`https://lichess.org/api/user/${encodeURIComponent(clean)}`, {
    signal: AbortSignal.timeout(6000)
  });
  if (!userRes.ok) {
    if (userRes.status === 404) throw new Error(`Lichess player "${username}" was not found.`);
    throw new Error(`Failed to load Lichess profile (HTTP ${userRes.status}).`);
  }
  const user = await userRes.json();

  // 2. Fetch games (up to 40 games for deep statistical analysis)
  const gamesUrl = `https://lichess.org/api/games/user/${encodeURIComponent(clean)}?max=40&moves=true&opening=true&pgnInJson=true`;
  const gamesRes = await fetch(gamesUrl, {
    headers: { Accept: "application/x-ndjson" },
    signal: AbortSignal.timeout(9000)
  });

  const rawGames: any[] = [];
  if (gamesRes.ok) {
    const text = await gamesRes.text();
    const lines = text.trim().split("\n");
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        rawGames.push(JSON.parse(line));
      } catch (_e) {
        // ignore malformed line
      }
    }
  }

  // 3. Process games and compute stats
  const gameSummaries: AccountGameSummary[] = [];
  let whiteWins = 0, whiteLosses = 0, whiteDraws = 0;
  let blackWins = 0, blackLosses = 0, blackDraws = 0;
  const openingsMap = new Map<string, {
    eco: string;
    name: string;
    wins: number;
    losses: number;
    draws: number;
    playedAsWhite: number;
    playedAsBlack: number;
    fen?: string;
  }>();

  for (const g of rawGames) {
    const isWhite = g.players?.white?.user?.id?.toLowerCase() === clean;
    const isBlack = g.players?.black?.user?.id?.toLowerCase() === clean;
    if (!isWhite && !isBlack) continue;

    const playerColor: "w" | "b" = isWhite ? "w" : "b";
    const opponent = isWhite ? (g.players?.black?.user?.name || "Anonymous") : (g.players?.white?.user?.name || "Anonymous");
    const opponentRating = isWhite ? (g.players?.black?.rating || 1500) : (g.players?.white?.rating || 1500);

    let result: "W" | "L" | "D" = "D";
    if (g.winner === "white") {
      result = isWhite ? "W" : "L";
    } else if (g.winner === "black") {
      result = isBlack ? "W" : "L";
    } else {
      result = "D";
    }

    if (playerColor === "w") {
      if (result === "W") whiteWins++;
      else if (result === "L") whiteLosses++;
      else whiteDraws++;
    } else {
      if (result === "W") blackWins++;
      else if (result === "L") blackLosses++;
      else blackDraws++;
    }

    // Opening extraction
    const eco = g.opening?.eco || "A00";
    const openingName = g.opening?.name || deriveOpeningNameFromMoves(g.moves);

    const existingOpening = openingsMap.get(openingName) || {
      eco,
      name: openingName,
      wins: 0,
      losses: 0,
      draws: 0,
      playedAsWhite: 0,
      playedAsBlack: 0,
      fen: undefined as string | undefined
    };

    if (result === "W") existingOpening.wins++;
    else if (result === "L") existingOpening.losses++;
    else existingOpening.draws++;

    if (playerColor === "w") existingOpening.playedAsWhite++;
    else existingOpening.playedAsBlack++;

    // Try to get representative FEN for opening
    if (!existingOpening.fen && g.moves) {
      existingOpening.fen = computeOpeningFen(g.moves);
    }
    openingsMap.set(openingName, existingOpening);

    // Moves count
    const moveTokens = g.moves ? g.moves.trim().split(/\s+/) : [];
    const movesCount = Math.ceil(moveTokens.length / 2);

    gameSummaries.push({
      id: g.id,
      url: `https://lichess.org/${g.id}`,
      opponent,
      opponentRating,
      playerColor,
      result,
      opening: openingName,
      eco,
      movesCount,
      date: g.createdAt ? new Date(g.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recent",
      pgn: g.pgn || formatPgnFromMoves(g.moves, isWhite ? user.username : opponent, isWhite ? opponent : user.username, result),
      timeControl: g.speed || "blitz"
    });
  }

  // Aggregate openings list
  const openingsList: OpeningPerformance[] = Array.from(openingsMap.values()).map(o => {
    const total = o.wins + o.losses + o.draws;
    const playedAs: "white" | "black" | "both" =
      o.playedAsWhite > 0 && o.playedAsBlack > 0 ? "both" : o.playedAsWhite > 0 ? "white" : "black";
    return {
      name: o.name,
      eco: o.eco,
      games: total,
      wins: o.wins,
      losses: o.losses,
      draws: o.draws,
      winPct: total > 0 ? Math.round((o.wins / total) * 100) : 0,
      lossPct: total > 0 ? Math.round((o.losses / total) * 100) : 0,
      drawPct: total > 0 ? Math.round((o.draws / total) * 100) : 0,
      playedAs,
      fen: o.fen
    };
  }).sort((a, b) => b.games - a.games);

  // Overall totals
  const totalGames = gameSummaries.length || user.count?.all || 0;
  const totalWins = whiteWins + blackWins || user.count?.win || 0;
  const totalLosses = whiteLosses + blackLosses || user.count?.loss || 0;
  const totalDraws = whiteDraws + blackDraws || user.count?.draw || 0;
  const grandTotal = totalWins + totalLosses + totalDraws || 1;

  const totalWhite = whiteWins + whiteLosses + whiteDraws;
  const totalBlack = blackWins + blackLosses + blackDraws;

  const whiteWinPct = totalWhite > 0 ? Math.round((whiteWins / totalWhite) * 100) : 50;
  const blackWinPct = totalBlack > 0 ? Math.round((blackWins / totalBlack) * 100) : 45;

  // Identify weak & strong openings
  const weakOpenings = openingsList
    .filter(o => o.games >= 2 && o.winPct < 50)
    .sort((a, b) => a.winPct - b.winPct)
    .slice(0, 5)
    .map(o => ({
      name: o.name,
      eco: o.eco,
      winPct: o.winPct,
      games: o.games,
      recommendation: getOpeningRecommendation(o.name, o.winPct, o.playedAs),
      fen: o.fen
    }));

  const strongOpenings = openingsList
    .filter(o => o.games >= 2 && o.winPct >= 55)
    .sort((a, b) => b.winPct - a.winPct)
    .slice(0, 5)
    .map(o => ({
      name: o.name,
      eco: o.eco,
      winPct: o.winPct,
      games: o.games
    }));

  // Diagnostic insights for what to improve
  const improvementInsights = generateInsights({
    whiteWinPct,
    blackWinPct,
    totalWhite,
    totalBlack,
    weakOpenings,
    strongOpenings,
    openingsList,
    ratings: user.perfs
  });

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
    },
    summary: {
      totalGames,
      wins: totalWins,
      losses: totalLosses,
      draws: totalDraws,
      winPct: Math.round((totalWins / grandTotal) * 100),
      lossPct: Math.round((totalLosses / grandTotal) * 100),
      drawPct: Math.round((totalDraws / grandTotal) * 100)
    },
    colorStats: {
      white: {
        games: totalWhite,
        wins: whiteWins,
        losses: whiteLosses,
        draws: whiteDraws,
        winPct: whiteWinPct
      },
      black: {
        games: totalBlack,
        wins: blackWins,
        losses: blackLosses,
        draws: blackDraws,
        winPct: blackWinPct
      }
    },
    openings: openingsList,
    weakOpenings,
    strongOpenings,
    improvementInsights,
    games: gameSummaries
  };
}

/**
 * Fetch and analyze Chess.com account
 */
export async function fetchChessComAccountReview(username: string): Promise<AccountReviewData> {
  const clean = username.trim().toLowerCase();
  if (!clean) throw new Error("Please enter a Chess.com username.");

  // 1. Fetch profile
  const userRes = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(clean)}`, {
    signal: AbortSignal.timeout(6000)
  });
  if (!userRes.ok) {
    if (userRes.status === 404) throw new Error(`Chess.com player "${username}" was not found.`);
    throw new Error(`Failed to load Chess.com profile (HTTP ${userRes.status}).`);
  }
  const user = await userRes.json();

  // 2. Fetch stats
  let stats: any = {};
  try {
    const statsRes = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(clean)}/stats`, {
      signal: AbortSignal.timeout(5000)
    });
    if (statsRes.ok) stats = await statsRes.json();
  } catch (_e) {
    // optional
  }

  // 3. Fetch recent monthly archives (up to 2 recent months)
  let rawGames: any[] = [];
  try {
    const arcRes = await fetch(`https://api.chess.com/pub/player/${encodeURIComponent(clean)}/games/archives`, {
      signal: AbortSignal.timeout(6000)
    });
    if (arcRes.ok) {
      const arcData = await arcRes.json();
      const archives: string[] = arcData.archives || [];
      const recentArchives = archives.slice(-2); // last 2 months

      for (let i = recentArchives.length - 1; i >= 0; i--) {
        const mRes = await fetch(recentArchives[i], { signal: AbortSignal.timeout(6000) });
        if (mRes.ok) {
          const mData = await mRes.json();
          if (Array.isArray(mData.games)) {
            rawGames = [...rawGames, ...mData.games];
            if (rawGames.length >= 40) break;
          }
        }
      }
    }
  } catch (_e) {
    // proceed with whatever games we got
  }

  // Take the most recent 40 games
  const selectedGames = rawGames.slice(-40).reverse();

  const gameSummaries: AccountGameSummary[] = [];
  let whiteWins = 0, whiteLosses = 0, whiteDraws = 0;
  let blackWins = 0, blackLosses = 0, blackDraws = 0;
  const openingsMap = new Map<string, {
    eco: string;
    name: string;
    wins: number;
    losses: number;
    draws: number;
    playedAsWhite: number;
    playedAsBlack: number;
    fen?: string;
  }>();

  for (const g of selectedGames) {
    const isWhite = g.white?.username?.toLowerCase() === clean;
    const isBlack = g.black?.username?.toLowerCase() === clean;
    if (!isWhite && !isBlack) continue;

    const playerColor: "w" | "b" = isWhite ? "w" : "b";
    const opponent = isWhite ? (g.black?.username || "Opponent") : (g.white?.username || "Opponent");
    const opponentRating = isWhite ? (g.black?.rating || 1500) : (g.white?.rating || 1500);

    const whiteResult = g.white?.result;
    const blackResult = g.black?.result;

    let result: "W" | "L" | "D" = "D";
    if (isWhite) {
      if (whiteResult === "win") result = "W";
      else if (["checkmated", "resigned", "timeout", "abandoned"].includes(whiteResult)) result = "L";
      else result = "D";
    } else {
      if (blackResult === "win") result = "W";
      else if (["checkmated", "resigned", "timeout", "abandoned"].includes(blackResult)) result = "L";
      else result = "D";
    }

    if (playerColor === "w") {
      if (result === "W") whiteWins++;
      else if (result === "L") whiteLosses++;
      else whiteDraws++;
    } else {
      if (result === "W") blackWins++;
      else if (result === "L") blackLosses++;
      else blackDraws++;
    }

    // Extract opening name from PGN headers or ECO URL
    const pgn = g.pgn || "";
    const ecoMatch = pgn.match(/\[ECO "(.*?)"\]/);
    const eco = ecoMatch ? ecoMatch[1] : "A00";

    const openingUrlMatch = pgn.match(/\[ECOUrl "https:\/\/www\.chess\.com\/openings\/(.*?)"\]/);
    let openingName = "Standard Chess";
    if (openingUrlMatch) {
      openingName = openingUrlMatch[1].replace(/-/g, " ");
      openingName = openingName.replace(/\b\w/g, l => l.toUpperCase());
    } else {
      openingName = deriveOpeningFromPgn(pgn);
    }

    const existingOpening = openingsMap.get(openingName) || {
      eco,
      name: openingName,
      wins: 0,
      losses: 0,
      draws: 0,
      playedAsWhite: 0,
      playedAsBlack: 0,
      fen: undefined as string | undefined
    };

    if (result === "W") existingOpening.wins++;
    else if (result === "L") existingOpening.losses++;
    else existingOpening.draws++;

    if (playerColor === "w") existingOpening.playedAsWhite++;
    else existingOpening.playedAsBlack++;

    if (!existingOpening.fen && pgn) {
      try {
        const c = new Chess();
        c.loadPgn(pgn);
        const moves = c.history();
        const shortG = new Chess();
        for (let i = 0; i < Math.min(8, moves.length); i++) {
          shortG.move(moves[i]);
        }
        existingOpening.fen = shortG.fen();
      } catch (_e) {
        // ignore
      }
    }
    openingsMap.set(openingName, existingOpening);

    // Moves count
    let movesCount = 20;
    try {
      const ch = new Chess();
      ch.loadPgn(pgn);
      movesCount = Math.ceil(ch.history().length / 2);
    } catch (_e) {
      //
    }

    const dateStr = g.end_time ? new Date(g.end_time * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "Recent";

    gameSummaries.push({
      id: g.url ? g.url.split("/").pop() || String(Math.random()) : String(Math.random()),
      url: g.url,
      opponent,
      opponentRating,
      playerColor,
      result,
      opening: openingName,
      eco,
      movesCount,
      date: dateStr,
      pgn,
      timeControl: g.time_class || "rapid"
    });
  }

  // Aggregate openings list
  const openingsList: OpeningPerformance[] = Array.from(openingsMap.values()).map(o => {
    const total = o.wins + o.losses + o.draws;
    const playedAs: "white" | "black" | "both" =
      o.playedAsWhite > 0 && o.playedAsBlack > 0 ? "both" : o.playedAsWhite > 0 ? "white" : "black";
    return {
      name: o.name,
      eco: o.eco,
      games: total,
      wins: o.wins,
      losses: o.losses,
      draws: o.draws,
      winPct: total > 0 ? Math.round((o.wins / total) * 100) : 0,
      lossPct: total > 0 ? Math.round((o.losses / total) * 100) : 0,
      drawPct: total > 0 ? Math.round((o.draws / total) * 100) : 0,
      playedAs,
      fen: o.fen
    };
  }).sort((a, b) => b.games - a.games);

  const totalWhite = whiteWins + whiteLosses + whiteDraws;
  const totalBlack = blackWins + blackLosses + blackDraws;
  const totalGames = gameSummaries.length || 1;
  const totalWins = whiteWins + blackWins;
  const totalLosses = whiteLosses + blackLosses;
  const totalDraws = whiteDraws + blackDraws;
  const grandTotal = totalWins + totalLosses + totalDraws || 1;

  const whiteWinPct = totalWhite > 0 ? Math.round((whiteWins / totalWhite) * 100) : 50;
  const blackWinPct = totalBlack > 0 ? Math.round((blackWins / totalBlack) * 100) : 45;

  const weakOpenings = openingsList
    .filter(o => o.games >= 2 && o.winPct < 50)
    .sort((a, b) => a.winPct - b.winPct)
    .slice(0, 5)
    .map(o => ({
      name: o.name,
      eco: o.eco,
      winPct: o.winPct,
      games: o.games,
      recommendation: getOpeningRecommendation(o.name, o.winPct, o.playedAs),
      fen: o.fen
    }));

  const strongOpenings = openingsList
    .filter(o => o.games >= 2 && o.winPct >= 55)
    .sort((a, b) => b.winPct - a.winPct)
    .slice(0, 5)
    .map(o => ({
      name: o.name,
      eco: o.eco,
      winPct: o.winPct,
      games: o.games
    }));

  const improvementInsights = generateInsights({
    whiteWinPct,
    blackWinPct,
    totalWhite,
    totalBlack,
    weakOpenings,
    strongOpenings,
    openingsList,
    ratings: {
      blitz: stats.chess_blitz?.last?.rating,
      rapid: stats.chess_rapid?.last?.rating,
      bullet: stats.chess_bullet?.last?.rating
    }
  });

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
    },
    summary: {
      totalGames,
      wins: totalWins,
      losses: totalLosses,
      draws: totalDraws,
      winPct: Math.round((totalWins / grandTotal) * 100),
      lossPct: Math.round((totalLosses / grandTotal) * 100),
      drawPct: Math.round((totalDraws / grandTotal) * 100)
    },
    colorStats: {
      white: {
        games: totalWhite,
        wins: whiteWins,
        losses: whiteLosses,
        draws: whiteDraws,
        winPct: whiteWinPct
      },
      black: {
        games: totalBlack,
        wins: blackWins,
        losses: blackLosses,
        draws: blackDraws,
        winPct: blackWinPct
      }
    },
    openings: openingsList,
    weakOpenings,
    strongOpenings,
    improvementInsights,
    games: gameSummaries
  };
}

// ---------------- Helper Functions ---------------- //

function computeOpeningFen(movesStr: string): string {
  try {
    const c = new Chess();
    const tokens = movesStr.trim().split(/\s+/);
    for (let i = 0; i < Math.min(8, tokens.length); i++) {
      c.move(tokens[i]);
    }
    return c.fen();
  } catch (_e) {
    return "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  }
}

function deriveOpeningNameFromMoves(movesStr?: string): string {
  if (!movesStr) return "Open Game";
  const first = movesStr.trim().split(/\s+/).slice(0, 4).join(" ");
  if (first.startsWith("e4 c5")) return "Sicilian Defense";
  if (first.startsWith("e4 e5 Nf3 Nc6 Bc4")) return "Italian Game";
  if (first.startsWith("e4 e5 Nf3 Nc6 Bb5")) return "Ruy Lopez";
  if (first.startsWith("e4 e6")) return "French Defense";
  if (first.startsWith("e4 c6")) return "Caro-Kann Defense";
  if (first.startsWith("d4 d5 c4")) return "Queen's Gambit";
  if (first.startsWith("d4 Nf6 c4 g6")) return "King's Indian Defense";
  if (first.startsWith("c4")) return "English Opening";
  if (first.startsWith("Nf3")) return "Reti Opening";
  return "Standard Opening";
}

function deriveOpeningFromPgn(pgn: string): string {
  if (pgn.includes("1. e4 c5")) return "Sicilian Defense";
  if (pgn.includes("1. e4 e5 2. Nf3 Nc6 3. Bc4")) return "Italian Game";
  if (pgn.includes("1. e4 e5 2. Nf3 Nc6 3. Bb5")) return "Ruy Lopez";
  if (pgn.includes("1. e4 e6")) return "French Defense";
  if (pgn.includes("1. e4 c6")) return "Caro-Kann Defense";
  if (pgn.includes("1. d4 d5 2. c4")) return "Queen's Gambit";
  if (pgn.includes("1. d4 Nf6 2. c4 g6")) return "King's Indian Defense";
  if (pgn.includes("1. c4")) return "English Opening";
  return "Chess Opening";
}

function formatPgnFromMoves(movesStr: string | undefined, white: string, black: string, result: string): string {
  const resStr = result === "W" ? "1-0" : result === "L" ? "0-1" : "1/2-1/2";
  return `[White "${white}"]\n[Black "${black}"]\n[Result "${resStr}"]\n\n${movesStr || ""} ${resStr}`;
}

function getOpeningRecommendation(openingName: string, winPct: number, playedAs: string): string {
  if (winPct < 35) {
    return `Low ${winPct}% win rate with ${playedAs}. Consider reviewing key plans or trying a solid alternative in Train mode.`;
  }
  if (winPct < 45) {
    return `Sub-optimal ${winPct}% win rate. Sharpen early tactical responses in the first 8 moves.`;
  }
  return `Room for refinement (${winPct}% score). Drill typical middlegame piece structures.`;
}

function generateInsights(data: {
  whiteWinPct: number;
  blackWinPct: number;
  totalWhite: number;
  totalBlack: number;
  weakOpenings: any[];
  strongOpenings: any[];
  openingsList: OpeningPerformance[];
  ratings: any;
}): ImprovementInsight[] {
  const insights: ImprovementInsight[] = [];

  // Color imbalance check
  const colorDiff = data.whiteWinPct - data.blackWinPct;
  if (colorDiff >= 15 && data.totalBlack >= 5) {
    insights.push({
      type: "warning",
      title: `Black Repertoire Vulnerability (${data.blackWinPct}% vs ${data.whiteWinPct}% as White)`,
      detail: `You win significantly fewer games when playing Black. Strengthen your defensive responses against 1.e4 and 1.d4 in Train mode to balance your scores.`
    });
  } else if (data.blackWinPct >= 55) {
    insights.push({
      type: "praise",
      title: `Resilient Black Defense (${data.blackWinPct}% win rate)`,
      detail: `Your score with the Black pieces is outstanding compared to standard player averages.`
    });
  }

  // Weakest opening check
  if (data.weakOpenings.length > 0) {
    const worst = data.weakOpenings[0];
    insights.push({
      type: "warning",
      title: `Critical Focus Area: ${worst.name} (${worst.winPct}% wins across ${worst.games} games)`,
      detail: `This opening is costing you the most rating points. Study master games in Learn and drill the standard moves in Train.`,
      actionableOpening: worst.name,
      actionableFen: worst.fen
    });
  }

  // Strongest opening check
  if (data.strongOpenings.length > 0) {
    const best = data.strongOpenings[0];
    insights.push({
      type: "praise",
      title: `Signature Weapon: ${best.name} (${best.winPct}% win rate)`,
      detail: `Your highest performing line. Keep steering opponents into this territory during your matches.`
    });
  }

  // Breadth vs depth insight
  if (data.openingsList.length >= 8) {
    insights.push({
      type: "tip",
      title: "Wide Repertoire Dispersal",
      detail: `You play across ${data.openingsList.length} different opening setups. Consolidating into 1-2 core systems for White and Black typically boosts consistency.`
    });
  } else {
    insights.push({
      type: "tip",
      title: "Targeted Repertoire Focus",
      detail: `You maintain a focused opening pool. Deepening tactical plans for your top 2 lines will maximize your conversion rate.`
    });
  }

  return insights;
}
