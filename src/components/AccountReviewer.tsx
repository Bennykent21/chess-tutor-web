import React, { useState, useEffect } from "react";
import {
  Search,
  Trophy,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  ExternalLink,
  Play,
  BookOpen,
  RotateCcw,
  Shield,
  Layers,
  Flame,
  Award,
  ChevronRight,
  UserCheck,
  CheckCircle2
} from "lucide-react";
import {
  fetchLichessAccountReview,
  fetchChessComAccountReview,
  AccountReviewData,
  OpeningPerformance,
  AccountGameSummary
} from "../lib/accountStats";

interface AccountReviewerProps {
  onTrainOpening?: (fen: string, title: string, goal?: string) => void;
  onStudyInLearn?: (fen: string, title: string) => void;
  onAnalyzeGame?: (game: AccountGameSummary) => void;
}

export function AccountReviewer({
  onTrainOpening,
  onStudyInLearn,
  onAnalyzeGame
}: AccountReviewerProps) {
  const [platform, setPlatform] = useState<"lichess" | "chess.com">("lichess");
  const [usernameInput, setUsernameInput] = useState("MagnusCarlsen");
  const [activeAccount, setActiveAccount] = useState<AccountReviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [openingsFilter, setOpeningsFilter] = useState<"all" | "white" | "black">("all");
  const [gamesFilter, setGamesFilter] = useState<"all" | "wins" | "losses">("all");

  // Initial load with sample player
  useEffect(() => {
    loadAccount("lichess", "MagnusCarlsen");
  }, []);

  async function loadAccount(targetPlatform: "lichess" | "chess.com", username: string) {
    if (!username.trim()) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      let data: AccountReviewData;
      if (targetPlatform === "lichess") {
        data = await fetchLichessAccountReview(username);
      } else {
        data = await fetchChessComAccountReview(username);
      }
      setActiveAccount(data);
      setIsLoading(false);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMessage(err?.message || "Failed to analyze account. Please check the username.");
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    loadAccount(platform, usernameInput);
  }

  function handleQuickSelect(plat: "lichess" | "chess.com", user: string) {
    setPlatform(plat);
    setUsernameInput(user);
    loadAccount(plat, user);
  }

  const filteredOpenings = (activeAccount?.openings || []).filter(o => {
    if (openingsFilter === "white") return o.playedAs === "white" || o.playedAs === "both";
    if (openingsFilter === "black") return o.playedAs === "black" || o.playedAs === "both";
    return true;
  });

  const filteredGames = (activeAccount?.games || []).filter(g => {
    if (gamesFilter === "wins") return g.result === "W";
    if (gamesFilter === "losses") return g.result === "L";
    return true;
  });

  return (
    <div className="account-reviewer-root">
      {/* Account Input & Platform Switcher Bar */}
      <div className="reviewer-search-bar-card">
        <div className="reviewer-search-header">
          <div>
            <span className="surface-label">ACCOUNT PERFORMANCE REVIEW</span>
            <h2 className="text-xl font-bold text-zinc-100 mt-0.5">
              Sync & Analyze Lichess or Chess.com Account
            </h2>
            <p className="text-sm text-zinc-400 mt-1">
              Automatic API analysis inside the app: reviews your games, openings, win/draw/loss percentages, and identifies exactly what you need to improve.
            </p>
          </div>

          <div className="platform-toggle-group">
            <button
              type="button"
              className={`platform-btn ${platform === "lichess" ? "active" : ""}`}
              onClick={() => {
                setPlatform("lichess");
                if (usernameInput === "hikaru") setUsernameInput("MagnusCarlsen");
              }}
            >
              <span>Lichess.org</span>
            </button>
            <button
              type="button"
              className={`platform-btn ${platform === "chess.com" ? "active" : ""}`}
              onClick={() => {
                setPlatform("chess.com");
                if (usernameInput === "MagnusCarlsen") setUsernameInput("hikaru");
              }}
            >
              <span>Chess.com</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleSearchSubmit} className="reviewer-input-form mt-4">
          <div className="reviewer-input-wrap">
            <Search className="search-icon w-4 h-4 text-zinc-400" />
            <input
              type="text"
              className="reviewer-username-input"
              placeholder={`Enter ${platform === "lichess" ? "Lichess" : "Chess.com"} username…`}
              value={usernameInput}
              onChange={e => setUsernameInput(e.target.value)}
            />
          </div>
          <button
            type="submit"
            className="reviewer-submit-btn"
            disabled={isLoading || !usernameInput.trim()}
          >
            {isLoading ? "Analyzing..." : "Review Account"}
          </button>
        </form>

        {/* Quick sample account tags */}
        <div className="quick-accounts-row mt-3">
          <span className="text-xs text-zinc-400 font-medium">Quick examples:</span>
          <button
            type="button"
            className="quick-account-chip"
            onClick={() => handleQuickSelect("lichess", "MagnusCarlsen")}
          >
            MagnusCarlsen (Lichess)
          </button>
          <button
            type="button"
            className="quick-account-chip"
            onClick={() => handleQuickSelect("chess.com", "hikaru")}
          >
            Hikaru (Chess.com)
          </button>
          <button
            type="button"
            className="quick-account-chip"
            onClick={() => handleQuickSelect("lichess", "EricRosen")}
          >
            EricRosen (Lichess)
          </button>
          <button
            type="button"
            className="quick-account-chip"
            onClick={() => handleQuickSelect("chess.com", "GothamChess")}
          >
            GothamChess (Chess.com)
          </button>
        </div>

        {errorMessage && (
          <div className="reviewer-error-banner mt-3">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="text-xs text-rose-300">{errorMessage}</span>
          </div>
        )}
      </div>

      {isLoading && (
        <div className="reviewer-loading-card">
          <div className="analysis-spinner-large" />
          <h4 className="text-sm font-semibold text-zinc-200 mt-3">
            Fetching games & calculating opening statistics from {platform === "lichess" ? "Lichess" : "Chess.com"}…
          </h4>
          <p className="text-xs text-zinc-400 mt-1">
            Analyzing win/loss ratios, color performance, and opening weaknesses.
          </p>
        </div>
      )}

      {!isLoading && activeAccount && (
        <div className="reviewer-results-container">
          {/* Top Profile & Summary Stats Row */}
          <div className="reviewer-profile-header-card">
            <div className="profile-identity-col">
              <div className="profile-badge-row">
                {activeAccount.title && (
                  <span className="title-pill">{activeAccount.title}</span>
                )}
                <h3 className="profile-name">{activeAccount.username}</h3>
                <span className="platform-tag">
                  {activeAccount.platform === "lichess" ? "Lichess.org" : "Chess.com"}
                </span>
              </div>
              <p className="profile-subtext">
                Performance analyzed across <strong>{activeAccount.summary.totalGames}</strong> games
              </p>
            </div>

            {/* Ratings Grid */}
            <div className="ratings-pill-grid">
              {activeAccount.ratings.rapid && (
                <div className="rating-pill">
                  <span className="rating-label">Rapid</span>
                  <b className="rating-val">{activeAccount.ratings.rapid}</b>
                </div>
              )}
              {activeAccount.ratings.blitz && (
                <div className="rating-pill">
                  <span className="rating-label">Blitz</span>
                  <b className="rating-val">{activeAccount.ratings.blitz}</b>
                </div>
              )}
              {activeAccount.ratings.bullet && (
                <div className="rating-pill">
                  <span className="rating-label">Bullet</span>
                  <b className="rating-val">{activeAccount.ratings.bullet}</b>
                </div>
              )}
              {activeAccount.ratings.puzzle && (
                <div className="rating-pill">
                  <span className="rating-label">Puzzles</span>
                  <b className="rating-val">{activeAccount.ratings.puzzle}</b>
                </div>
              )}
            </div>
          </div>

          {/* Key Performance Metrics Bar */}
          <div className="reviewer-metrics-grid">
            {/* Overall Win Rate Card */}
            <div className="stat-card">
              <div className="stat-card-head">
                <span className="surface-label">OVERALL RECORD</span>
                <Trophy className="w-4 h-4 text-amber-400" />
              </div>
              <div className="stat-primary-row">
                <span className="stat-big-number text-emerald-400">
                  {activeAccount.summary.winPct}%
                </span>
                <span className="stat-sub-text">Win Rate</span>
              </div>
              <div className="stat-counts-row">
                <span>{activeAccount.summary.wins}W</span>
                <span>·</span>
                <span>{activeAccount.summary.draws}D</span>
                <span>·</span>
                <span>{activeAccount.summary.losses}L</span>
              </div>
              {/* Tri-color progress bar */}
              <div className="tri-color-bar mt-2">
                <div
                  className="bar-slice white-slice"
                  style={{ width: `${activeAccount.summary.winPct}%` }}
                  title={`Wins: ${activeAccount.summary.winPct}%`}
                />
                <div
                  className="bar-slice draw-slice"
                  style={{ width: `${activeAccount.summary.drawPct}%` }}
                  title={`Draws: ${activeAccount.summary.drawPct}%`}
                />
                <div
                  className="bar-slice black-slice"
                  style={{ width: `${activeAccount.summary.lossPct}%` }}
                  title={`Losses: ${activeAccount.summary.lossPct}%`}
                />
              </div>
            </div>

            {/* White Pieces Performance */}
            <div className="stat-card">
              <div className="stat-card-head">
                <span className="surface-label">PLAYING WHITE</span>
                <span className="side-mark white inline-block" />
              </div>
              <div className="stat-primary-row">
                <span className="stat-big-number text-zinc-100">
                  {activeAccount.colorStats.white.winPct}%
                </span>
                <span className="stat-sub-text">White Win Rate</span>
              </div>
              <div className="stat-counts-row">
                <span>{activeAccount.colorStats.white.wins}W</span>
                <span>·</span>
                <span>{activeAccount.colorStats.white.draws}D</span>
                <span>·</span>
                <span>{activeAccount.colorStats.white.losses}L</span>
                <span className="mono text-zinc-500">({activeAccount.colorStats.white.games} games)</span>
              </div>
              <div className="single-prog-bar mt-2">
                <span style={{ width: `${activeAccount.colorStats.white.winPct}%` }} />
              </div>
            </div>

            {/* Black Pieces Performance */}
            <div className="stat-card">
              <div className="stat-card-head">
                <span className="surface-label">PLAYING BLACK</span>
                <span className="side-mark black inline-block" />
              </div>
              <div className="stat-primary-row">
                <span className="stat-big-number text-zinc-100">
                  {activeAccount.colorStats.black.winPct}%
                </span>
                <span className="stat-sub-text">Black Win Rate</span>
              </div>
              <div className="stat-counts-row">
                <span>{activeAccount.colorStats.black.wins}W</span>
                <span>·</span>
                <span>{activeAccount.colorStats.black.draws}D</span>
                <span>·</span>
                <span>{activeAccount.colorStats.black.losses}L</span>
                <span className="mono text-zinc-500">({activeAccount.colorStats.black.games} games)</span>
              </div>
              <div className="single-prog-bar mt-2">
                <span style={{ width: `${activeAccount.colorStats.black.winPct}%` }} />
              </div>
            </div>
          </div>

          {/* DIAGNOSTIC PANEL: "WHAT TO IMPROVE" */}
          <div className="diagnostic-section-card">
            <div className="diagnostic-header">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-zinc-100">
                  What You Need to Improve (Coach Diagnosis)
                </h3>
              </div>
              <span className="diagnostic-count-pill">
                {activeAccount.improvementInsights.length} actionable insights
              </span>
            </div>

            <div className="insights-grid mt-3">
              {activeAccount.improvementInsights.map((insight, idx) => (
                <div
                  key={idx}
                  className={`insight-card ${insight.type === "warning" ? "warning-type" : insight.type === "praise" ? "praise-type" : "tip-type"}`}
                >
                  <div className="insight-card-top">
                    {insight.type === "warning" ? (
                      <TrendingDown className="w-4 h-4 text-rose-400 shrink-0" />
                    ) : insight.type === "praise" ? (
                      <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                    ) : (
                      <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
                    )}
                    <h4 className="font-semibold text-sm text-zinc-100">{insight.title}</h4>
                  </div>
                  <p className="text-xs text-zinc-300 mt-1 leading-relaxed">
                    {insight.detail}
                  </p>
                  {insight.actionableOpening && onTrainOpening && (
                    <div className="insight-action-row mt-2.5">
                      <button
                        type="button"
                        className="insight-train-btn"
                        onClick={() =>
                          onTrainOpening(
                            insight.actionableFen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
                            insight.actionableOpening || "Opening Drill",
                            `Master the key responses and tactical structures in the ${insight.actionableOpening}`
                          )
                        }
                      >
                        <Play className="w-3.5 h-3.5 mr-1" />
                        <span>Train this line in Train Mode</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Weakest Openings Highlight Bar */}
            {activeAccount.weakOpenings.length > 0 && (
              <div className="weak-openings-bar mt-4">
                <h4 className="text-xs uppercase tracking-wider font-semibold text-rose-400 mb-2">
                  Highest Priority Opening Fixes (Lowest Win Rates):
                </h4>
                <div className="weak-openings-grid">
                  {activeAccount.weakOpenings.map(wo => (
                    <div className="weak-opening-item" key={wo.name}>
                      <div className="weak-opening-head">
                        <span className="mono text-xs font-bold text-zinc-400">{wo.eco}</span>
                        <b className="text-xs text-zinc-100 truncate">{wo.name}</b>
                        <span className="weak-score-badge">{wo.winPct}% win</span>
                      </div>
                      <p className="weak-rec-text">{wo.recommendation}</p>
                      {onTrainOpening && (
                        <button
                          type="button"
                          className="weak-train-link"
                          onClick={() =>
                            onTrainOpening(
                              wo.fen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
                              wo.name,
                              `Drill the theoretical lines for ${wo.name} to raise your ${wo.winPct}% win rate.`
                            )
                          }
                        >
                          <Play className="w-3 h-3 mr-1" /> Train in Train Mode
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* OPENINGS REPERTOIRE BREAKDOWN TABLE */}
          <div className="openings-table-card mt-6">
            <div className="table-header-row">
              <div>
                <span className="surface-label">OPENING REPERTOIRE ANALYSIS</span>
                <h3 className="text-base font-bold text-zinc-100">
                  Games & Win Percentage by Opening
                </h3>
              </div>

              <div className="filter-chips-row">
                <button
                  type="button"
                  className={`filter-chip ${openingsFilter === "all" ? "active" : ""}`}
                  onClick={() => setOpeningsFilter("all")}
                >
                  All ({activeAccount.openings.length})
                </button>
                <button
                  type="button"
                  className={`filter-chip ${openingsFilter === "white" ? "active" : ""}`}
                  onClick={() => setOpeningsFilter("white")}
                >
                  As White
                </button>
                <button
                  type="button"
                  className={`filter-chip ${openingsFilter === "black" ? "active" : ""}`}
                  onClick={() => setOpeningsFilter("black")}
                >
                  As Black
                </button>
              </div>
            </div>

            {filteredOpenings.length === 0 ? (
              <p className="text-xs text-zinc-400 py-4 italic">No opening records match this filter.</p>
            ) : (
              <div className="openings-table-scroll">
                <table className="repertoire-table">
                  <thead>
                    <tr>
                      <th>ECO</th>
                      <th>Opening Name</th>
                      <th>Games</th>
                      <th>Win Rate</th>
                      <th>Side</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOpenings.map(op => {
                      const isWeak = op.games >= 2 && op.winPct < 45;
                      const isStrong = op.games >= 2 && op.winPct >= 60;
                      return (
                        <tr key={op.name}>
                          <td className="mono text-xs font-semibold text-amber-400">{op.eco}</td>
                          <td className="opening-name-cell">
                            <span className="font-semibold text-zinc-100">{op.name}</span>
                            {isWeak && <span className="cell-pill warning">Needs Work</span>}
                            {isStrong && <span className="cell-pill praise">Strong</span>}
                          </td>
                          <td className="mono text-xs text-zinc-300">{op.games}</td>
                          <td className="win-pct-cell">
                            <div className="win-pct-flex">
                              <span className={`font-bold ${isWeak ? "text-rose-400" : isStrong ? "text-emerald-400" : "text-zinc-200"}`}>
                                {op.winPct}%
                              </span>
                              <div className="mini-win-bar">
                                <span
                                  className={isWeak ? "weak-fill" : "norm-fill"}
                                  style={{ width: `${op.winPct}%` }}
                                />
                              </div>
                            </div>
                            <span className="text-[10px] text-zinc-500">
                              {op.wins}W · {op.draws}D · {op.losses}L
                            </span>
                          </td>
                          <td className="capitalize text-xs text-zinc-400">{op.playedAs}</td>
                          <td className="actions-cell">
                            {onTrainOpening && (
                              <button
                                type="button"
                                className="table-train-btn"
                                onClick={() =>
                                  onTrainOpening(
                                    op.fen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
                                    op.name,
                                    `Practice the ${op.name} line to improve your performance.`
                                  )
                                }
                                title="Redirect to Train mode"
                              >
                                <Play className="w-3 h-3 mr-1" />
                                <span>Train</span>
                              </button>
                            )}
                            {onStudyInLearn && (
                              <button
                                type="button"
                                className="table-study-btn"
                                onClick={() =>
                                  onStudyInLearn(
                                    op.fen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
                                    op.name
                                  )
                                }
                                title="Study in Learn section"
                              >
                                <BookOpen className="w-3 h-3 mr-1" />
                                <span>Study</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* RECENT GAMES ARCHIVE */}
          <div className="games-archive-card mt-6">
            <div className="table-header-row">
              <div>
                <span className="surface-label">RECENT GAMES ARCHIVE</span>
                <h3 className="text-base font-bold text-zinc-100">
                  Games Played on {activeAccount.platform === "lichess" ? "Lichess" : "Chess.com"}
                </h3>
              </div>

              <div className="filter-chips-row">
                <button
                  type="button"
                  className={`filter-chip ${gamesFilter === "all" ? "active" : ""}`}
                  onClick={() => setGamesFilter("all")}
                >
                  All ({activeAccount.games.length})
                </button>
                <button
                  type="button"
                  className={`filter-chip ${gamesFilter === "wins" ? "active" : ""}`}
                  onClick={() => setGamesFilter("wins")}
                >
                  Wins
                </button>
                <button
                  type="button"
                  className={`filter-chip ${gamesFilter === "losses" ? "active" : ""}`}
                  onClick={() => setGamesFilter("losses")}
                >
                  Losses
                </button>
              </div>
            </div>

            {filteredGames.length === 0 ? (
              <p className="text-xs text-zinc-400 py-4 italic">No games found.</p>
            ) : (
              <div className="recent-games-list">
                {filteredGames.map(game => (
                  <div className="archive-game-row" key={game.id}>
                    <div className="archive-result-badge-wrap">
                      <span
                        className={`result-badge ${game.result === "W" ? "win" : game.result === "L" ? "loss" : "draw"}`}
                      >
                        {game.result}
                      </span>
                    </div>

                    <div className="archive-opponent-info">
                      <div className="flex items-center gap-2">
                        <span className={`side-mark ${game.playerColor === "w" ? "white" : "black"}`} />
                        <b className="text-sm text-zinc-100">{game.opponent}</b>
                        <span className="text-xs text-zinc-400 font-mono">({game.opponentRating})</span>
                      </div>
                      <span className="text-xs text-zinc-400 truncate block mt-0.5">
                        <span className="mono text-amber-400/80 mr-1.5">{game.eco}</span>
                        {game.opening}
                      </span>
                    </div>

                    <div className="archive-meta-info">
                      <span className="mono text-xs text-zinc-300">{game.movesCount} moves</span>
                      <span className="text-[11px] text-zinc-500 block">{game.date}</span>
                    </div>

                    <div className="archive-actions-col">
                      {onAnalyzeGame && (
                        <button
                          type="button"
                          className="archive-analyze-btn"
                          onClick={() => onAnalyzeGame(game)}
                          title="Analyse game with engine"
                        >
                          Analyse
                        </button>
                      )}
                      {game.url && (
                        <a
                          href={game.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="archive-external-btn"
                          title="View on platform"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
