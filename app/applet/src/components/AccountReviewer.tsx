import React, { useState, useEffect } from "react";
import {
  Search,
  Trophy,
  Flame,
  TrendingUp,
  AlertTriangle,
  Play,
  RotateCcw,
  ExternalLink,
  ChevronRight,
  Shield,
  Zap,
  CheckCircle2,
  XCircle,
  HelpCircle
} from "lucide-react";
import { reviewLichessAccount, reviewChessComAccount, AccountReviewData, AccountOpeningStat } from "../lib/accountReview";

interface AccountReviewerProps {
  onTrainPosition: (fen: string, title: string, goal: string) => void;
  defaultUsername?: string;
}

export function AccountReviewer({ onTrainPosition, defaultUsername = "MagnusCarlsen" }: AccountReviewerProps) {
  const [platform, setPlatform] = useState<"lichess" | "chesscom">("lichess");
  const [usernameInput, setUsernameInput] = useState(defaultUsername);
  const [data, setData] = useState<AccountReviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Quick preset accounts to test
  const presets = [
    { name: "Magnus Carlsen", user: "MagnusCarlsen", platform: "lichess" as const },
    { name: "Hikaru Nakamura", user: "Hikaru", platform: "chesscom" as const },
    { name: "Daniel Naroditsky", user: "DanielNaroditsky", platform: "lichess" as const },
    { name: "GothamChess", user: "GothamChess", platform: "chesscom" as const }
  ];

  function fetchAccount(u: string, p: "lichess" | "chesscom") {
    if (!u.trim()) return;
    setIsLoading(true);
    setError(null);

    const promise = p === "lichess" ? reviewLichessAccount(u) : reviewChessComAccount(u);
    promise
      .then(res => {
        setIsLoading(false);
        if (!res) {
          setError(`Could not find active account for "${u}" on ${p === "lichess" ? "Lichess" : "Chess.com"}.`);
          return;
        }
        setData(res);
      })
      .catch(err => {
        setIsLoading(false);
        setError(err?.message || "Failed to analyze account. Please try again.");
      });
  }

  useEffect(() => {
    fetchAccount(usernameInput, platform);
  }, []);

  return (
    <div className="account-reviewer-root">
      {/* Account Search & Platform Switcher */}
      <div className="account-search-bar">
        <div className="platform-toggle-group">
          <button
            type="button"
            className={`platform-btn ${platform === "lichess" ? "active" : ""}`}
            onClick={() => {
              setPlatform("lichess");
              fetchAccount(usernameInput, "lichess");
            }}
          >
            Lichess.org
          </button>
          <button
            type="button"
            className={`platform-btn ${platform === "chesscom" ? "active" : ""}`}
            onClick={() => {
              setPlatform("chesscom");
              fetchAccount(usernameInput, "chesscom");
            }}
          >
            Chess.com
          </button>
        </div>

        <div className="account-input-wrap">
          <input
            type="text"
            className="account-input"
            placeholder={`Enter ${platform === "lichess" ? "Lichess" : "Chess.com"} username...`}
            value={usernameInput}
            onChange={e => setUsernameInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && fetchAccount(usernameInput, platform)}
          />
          <button
            type="button"
            className="account-analyze-btn"
            onClick={() => fetchAccount(usernameInput, platform)}
            disabled={isLoading}
          >
            <Search className="w-4 h-4 mr-1.5" />
            <span>{isLoading ? "Analyzing..." : "Review Account"}</span>
          </button>
        </div>
      </div>

      {/* Preset Suggestions */}
      <div className="presets-row">
        <span className="text-xs text-zinc-400">Popular Accounts:</span>
        {presets.map(pr => (
          <button
            key={pr.user}
            type="button"
            className="preset-chip"
            onClick={() => {
              setPlatform(pr.platform);
              setUsernameInput(pr.user);
              fetchAccount(pr.user, pr.platform);
            }}
          >
            {pr.name} ({pr.platform})
          </button>
        ))}
      </div>

      {error && (
        <div className="account-error-box">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Account Overview Cards */}
      {data && (
        <div className="account-overview-section">
          {/* Top Profile Header */}
          <div className="account-hero-card">
            <div className="account-hero-top">
              <div>
                <span className="eyebrow">{data.platform === "lichess" ? "LICHESS ACCOUNT" : "CHESS.COM ACCOUNT"}</span>
                <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
                  {data.title && <span className="title-tag">{data.title}</span>}
                  <span>{data.username}</span>
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Overall analysis across {data.totalGames.toLocaleString()} games recorded on {data.platform === "lichess" ? "Lichess" : "Chess.com"}
                </p>
              </div>

              <div className="winrate-big-badge">
                <span className="text-xs text-zinc-400 block uppercase tracking-wider">Win Rate</span>
                <strong className="text-2xl font-mono text-emerald-400">{data.winRate}%</strong>
                <small className="text-[11px] text-zinc-400">
                  {data.wins}W · {data.draws}D · {data.losses}L
                </small>
              </div>
            </div>

            {/* Ratings Grid */}
            <div className="ratings-cards-grid mt-4">
              {data.ratings.rapid !== undefined && (
                <div className="rating-stat-card">
                  <span className="stat-label">Rapid</span>
                  <strong className="stat-val">{data.ratings.rapid}</strong>
                </div>
              )}
              {data.ratings.blitz !== undefined && (
                <div className="rating-stat-card">
                  <span className="stat-label">Blitz</span>
                  <strong className="stat-val">{data.ratings.blitz}</strong>
                </div>
              )}
              {data.ratings.bullet !== undefined && (
                <div className="rating-stat-card">
                  <span className="stat-label">Bullet</span>
                  <strong className="stat-val">{data.ratings.bullet}</strong>
                </div>
              )}
              {data.ratings.puzzles !== undefined && (
                <div className="rating-stat-card">
                  <span className="stat-label">Puzzles</span>
                  <strong className="stat-val text-amber-400">{data.ratings.puzzles}</strong>
                </div>
              )}
            </div>
          </div>

          {/* Key Areas to Improve / Weaknesses */}
          <div className="weaknesses-section">
            <div className="section-header">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-400" />
                <h3 className="font-semibold text-zinc-100 text-base">Key Improvement Areas & Weaknesses</h3>
              </div>
              <span className="text-xs text-zinc-400">Based on your recent game results</span>
            </div>

            <div className="weaknesses-grid">
              {data.weaknesses.map((w, idx) => (
                <div key={idx} className={`weakness-card ${w.severity}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="font-semibold text-zinc-100 text-sm">{w.title}</h4>
                      <p className="text-xs text-zinc-300 mt-1 leading-relaxed">{w.description}</p>
                    </div>
                    <span className={`severity-tag ${w.severity}`}>
                      {w.severity.toUpperCase()}
                    </span>
                  </div>

                  <div className="mt-3 pt-3 border-t border-zinc-800/80 flex items-center justify-between">
                    <span className="text-[11px] text-zinc-400">Recommended action:</span>
                    <button
                      type="button"
                      className="train-action-btn"
                      onClick={() =>
                        onTrainPosition(
                          w.sampleFen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
                          `Training Leaks: ${w.title}`,
                          `Fix tactical and positional weaknesses in ${w.openingName || "your repertoire"}.`
                        )
                      }
                    >
                      <Play className="w-3.5 h-3.5 mr-1" />
                      <span>Train in Train Mode</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Openings Performance Table */}
          <div className="openings-performance-card">
            <div className="section-header">
              <div>
                <h3 className="font-semibold text-zinc-100 text-base">Your Openings & Win Percentages</h3>
                <p className="text-xs text-zinc-400">
                  Performance across all variations played on your account
                </p>
              </div>
            </div>

            <div className="openings-table-container">
              <table className="openings-table">
                <thead>
                  <tr>
                    <th>Opening</th>
                    <th>ECO</th>
                    <th>Games</th>
                    <th style={{ width: "35%" }}>Win Rate Breakdown</th>
                    <th>Win %</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {data.openings.map(op => (
                    <tr key={op.name} className="opening-row">
                      <td className="font-medium text-zinc-200">{op.name}</td>
                      <td className="font-mono text-xs text-amber-400">{op.eco}</td>
                      <td className="font-mono text-xs text-zinc-300">{op.games}</td>
                      <td>
                        <div className="tri-color-bar mini">
                          <div
                            className="bar-slice white-slice"
                            style={{ width: `${op.winRate}%` }}
                            title={`Wins: ${op.wins}`}
                          />
                          <div
                            className="bar-slice draw-slice"
                            style={{ width: `${op.games > 0 ? Math.round((op.draws / op.games) * 100) : 0}%` }}
                            title={`Draws: ${op.draws}`}
                          />
                          <div
                            className="bar-slice black-slice"
                            style={{
                              width: `${op.games > 0 ? Math.round((op.losses / op.games) * 100) : 0}%`
                            }}
                            title={`Losses: ${op.losses}`}
                          />
                        </div>
                        <div className="text-[10px] text-zinc-400 mt-1">
                          {op.wins}W · {op.draws}D · {op.losses}L
                        </div>
                      </td>
                      <td className="font-mono font-bold text-sm">
                        <span className={op.winRate >= 50 ? "text-emerald-400" : "text-rose-400"}>
                          {op.winRate}%
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className="table-train-btn"
                          onClick={() =>
                            onTrainPosition(
                              op.sampleFen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
                              `Opening Mastery: ${op.name}`,
                              `Drill critical ideas and responses in the ${op.name}.`
                            )
                          }
                          title="Train this opening"
                        >
                          <Play className="w-3 h-3 mr-1" />
                          <span>Train</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Games Archive */}
          {data.recentGames.length > 0 && (
            <div className="recent-games-archive-card">
              <div className="section-header">
                <h3 className="font-semibold text-zinc-100 text-base">Recent Games Log</h3>
                <span className="text-xs text-zinc-400">Click any game to practice critical moments</span>
              </div>

              <div className="recent-games-list">
                {data.recentGames.map(rg => (
                  <div key={rg.id} className="recent-game-item">
                    <span className={`result-tag ${rg.result}`}>
                      {rg.result.toUpperCase()}
                    </span>
                    <div className="recent-game-info">
                      <strong className="text-xs text-zinc-200">vs {rg.opponent}</strong>
                      <span className="text-[11px] text-zinc-400 block truncate">
                        {rg.opening} · {rg.speed} · {rg.date}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="train-mistake-btn"
                      onClick={() =>
                        onTrainPosition(
                          rg.fen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
                          `Game Study vs ${rg.opponent}`,
                          `Find the winning move in this ${rg.opening} position from your game.`
                        )
                      }
                    >
                      <Play className="w-3 h-3 mr-1" />
                      <span>Train Position</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
