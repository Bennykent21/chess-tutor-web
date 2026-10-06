import React, { useState, useEffect, useMemo } from "react";
import { Chess, Square } from "chess.js";
import {
  Database,
  Globe,
  RotateCcw,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Search,
  Key,
  Flame,
  Award,
  Layers,
  Sparkles,
  CheckCircle2,
  X,
  Play,
  Copy,
  Check,
  Shield,
  HelpCircle
} from "lucide-react";
import { ChessPiece } from "./ChessPiece";
import {
  fetchLichessOpeningStats,
  fetchLichessTablebase,
  fetchLichessUserProfile,
  fetchLichessUserGames,
  fetchLichessDailyPuzzle,
  fetchLichessGame,
  getLichessToken,
  setLichessToken,
  LichessTablebaseResult,
  LichessTablebaseMove,
  LichessUserProfile,
  LichessGameItem,
  LichessDailyPuzzle,
  ExplorerResponse
} from "../lib/lichess";
import { OpeningStats, CandidateMove, MasterGame } from "../data/openingsDatabase";

const files = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;
const ranks = [8, 7, 6, 5, 4, 3, 2, 1] as const;

interface LichessExplorerViewProps {
  initialFen?: string;
  onPracticePosition?: (fen: string, title: string, goal?: string) => void;
  soundCues?: boolean;
}

export function LichessExplorerView({ initialFen, onPracticePosition, soundCues = true }: LichessExplorerViewProps) {
  // Chessboard state
  const [game, setGame] = useState(() => (initialFen ? new Chess(initialFen) : new Chess()));
  const [orientation, setOrientation] = useState<"w" | "b">("w");
  const [selectedSquare, setSelectedSquare] = useState<Square | null>(null);
  const [moveHistory, setMoveHistory] = useState<{ san: string; fen: string }[]>([]);

  useEffect(() => {
    if (initialFen) {
      try {
        setGame(new Chess(initialFen));
        setSelectedSquare(null);
        setMoveHistory([]);
        setHistoryIndex(-1);
      } catch (_e) {
        // fallback
      }
    }
  }, [initialFen]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Sub-tabs in Lichess explorer
  const [subTab, setSubTab] = useState<"explorer" | "player" | "puzzle" | "import">("explorer");

  // Opening Explorer state
  const [dbSource, setDbSource] = useState<"lichess" | "masters">("lichess");
  const [ratingFilters, setRatingFilters] = useState<number[]>([1800, 2000, 2200, 2500]);
  const [speedFilters, setSpeedFilters] = useState<string[]>(["blitz", "rapid", "classical"]);
  const [openingStats, setOpeningStats] = useState<OpeningStats | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(false);
  const [statsDataSource, setStatsDataSource] = useState<string>("local-database");
  const [isOnlineApi, setIsOnlineApi] = useState(false);

  // Syzygy tablebase state
  const [tablebase, setTablebase] = useState<LichessTablebaseResult | null>(null);
  const [isTablebaseLoading, setIsTablebaseLoading] = useState(false);

  // Player search state
  const [playerQuery, setPlayerQuery] = useState("MagnusCarlsen");
  const [playerProfile, setPlayerProfile] = useState<LichessUserProfile | null>(null);
  const [playerGames, setPlayerGames] = useState<LichessGameItem[]>([]);
  const [isPlayerLoading, setIsPlayerLoading] = useState(false);
  const [playerError, setPlayerError] = useState<string | null>(null);

  // Daily puzzle state
  const [dailyPuzzle, setDailyPuzzle] = useState<LichessDailyPuzzle | null>(null);
  const [isPuzzleLoading, setIsPuzzleLoading] = useState(false);
  const [puzzleMoveIndex, setPuzzleMoveIndex] = useState(0);
  const [puzzleSolved, setPuzzleSolved] = useState(false);
  const [puzzleMistake, setPuzzleMistake] = useState(false);

  // Import game state
  const [importQuery, setImportQuery] = useState("");
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const [copiedFen, setCopiedFen] = useState(false);

  // Quick preset openings
  const presetOpenings = [
    { name: "Initial", fen: "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1" },
    { name: "1. e4", fen: "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq e3 0 1" },
    { name: "Italian Game", fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3" },
    { name: "Ruy Lopez", fen: "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P4/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3" },
    { name: "Sicilian Defense", fen: "rnbqkbnr/pp1ppppp/8/2p5/4P4/8/PPPP1PPP/RNBQKBNR w KQkq c6 0 2" },
    { name: "1. d4", fen: "rnbqkbnr/pppppppp/8/8/3P4/8/PPP1PPPP/RNBQKBNR b KQkq d3 0 1" },
    { name: "Queen's Gambit", fen: "rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq c3 0 2" },
    { name: "Caro-Kann", fen: "rnbqkbnr/pp1ppppp/2p5/8/4P4/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2" },
    { name: "French Defense", fen: "rnbqkbnr/pppp1ppp/4p3/8/4P4/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2" }
  ];

  // Fetch opening stats & tablebase whenever FEN changes
  useEffect(() => {
    let active = true;
    const currentFen = game.fen();

    setIsStatsLoading(true);
    fetchLichessOpeningStats({
      fen: currentFen,
      source: dbSource,
      ratings: ratingFilters,
      speeds: speedFilters,
      moves: 12,
      topGames: 6
    })
      .then((res: ExplorerResponse) => {
        if (!active) return;
        setOpeningStats(res.stats);
        setStatsDataSource(res.source);
        setIsOnlineApi(res.online);
        setIsStatsLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setIsStatsLoading(false);
      });

    // Syzygy tablebase check
    const pieceCount = (currentFen.split(" ")[0].match(/[pnbrqkPNBRQK]/g) || []).length;
    if (pieceCount <= 7) {
      setIsTablebaseLoading(true);
      fetchLichessTablebase(currentFen)
        .then((res: LichessTablebaseResult | null) => {
          if (!active) return;
          setTablebase(res);
          setIsTablebaseLoading(false);
        })
        .catch(() => {
          if (!active) return;
          setIsTablebaseLoading(false);
        });
    } else {
      setTablebase(null);
    }

    return () => {
      active = false;
    };
  }, [game, dbSource, ratingFilters, speedFilters]);

  // Initial load of Magnus Carlsen profile and daily puzzle
  useEffect(() => {
    handleSearchPlayer("MagnusCarlsen");
    handleLoadDailyPuzzle();
  }, []);

  function handleSearchPlayer(usernameToSearch: string) {
    if (!usernameToSearch.trim()) return;
    setIsPlayerLoading(true);
    setPlayerError(null);

    Promise.all([
      fetchLichessUserProfile(usernameToSearch),
      fetchLichessUserGames(usernameToSearch, 8)
    ])
      .then(([prof, games]) => {
        setIsPlayerLoading(false);
        if (!prof) {
          setPlayerError(`Player "${usernameToSearch}" not found on Lichess.`);
          return;
        }
        setPlayerProfile(prof);
        setPlayerGames(games);
      })
      .catch(err => {
        setIsPlayerLoading(false);
        setPlayerError(err.message || "Failed to load player.");
      });
  }

  function handleLoadDailyPuzzle() {
    setIsPuzzleLoading(true);
    setPuzzleSolved(false);
    setPuzzleMistake(false);
    setPuzzleMoveIndex(0);

    fetchLichessDailyPuzzle()
      .then((pz: LichessDailyPuzzle | null) => {
        setIsPuzzleLoading(false);
        if (pz) {
          setDailyPuzzle(pz);
        }
      })
      .catch(() => {
        setIsPuzzleLoading(false);
      });
  }

  function startDailyPuzzleGame() {
    if (!dailyPuzzle) return;
    try {
      const g = new Chess();
      if (dailyPuzzle.pgn) {
        // Load the game up to initialPly
        g.loadPgn(dailyPuzzle.pgn);
      } else {
        g.load(dailyPuzzle.fen);
      }
      setGame(g);
      setOrientation(g.turn());
      setMoveHistory([]);
      setHistoryIndex(-1);
      setSubTab("explorer");
    } catch (_e) {
      // fallback
      const g = new Chess(dailyPuzzle.fen);
      setGame(g);
      setOrientation(g.turn());
      setSubTab("explorer");
    }
  }

  function handleImportGame() {
    if (!importQuery.trim()) return;
    setImportLoading(true);
    setImportError(null);

    fetchLichessGame(importQuery)
      .then((item: LichessGameItem | null) => {
        setImportLoading(false);
        if (!item || !item.moves) {
          setImportError("Could not retrieve game moves from Lichess. Verify the Game URL or ID.");
          return;
        }
        // Load into chess.js
        const movesList = item.moves.split(/\s+/);
        const g = new Chess();
        const history: { san: string; fen: string }[] = [];
        for (const mv of movesList) {
          try {
            const m = g.move(mv);
            if (m) {
              history.push({ san: m.san, fen: g.fen() });
            }
          } catch (_e) {
            break;
          }
        }
        setGame(g);
        setMoveHistory(history);
        setHistoryIndex(history.length - 1);
        setSubTab("explorer");
      })
      .catch((err: any) => {
        setImportLoading(false);
        setImportError(err?.message || "Failed to import game from Lichess.");
      });
  }

  // Legal targets for square click
  const legalTargets = useMemo(() => {
    if (!selectedSquare) return new Set<string>();
    return new Set(game.moves({ square: selectedSquare, verbose: true }).map(m => m.to));
  }, [game, selectedSquare]);

  function clickSquare(square: Square) {
    if (selectedSquare && legalTargets.has(square)) {
      const next = new Chess(game.fen());
      const move = next.move({ from: selectedSquare, to: square, promotion: "q" });
      if (move) {
        setGame(next);
        const newHist = [
          ...moveHistory.slice(0, historyIndex + 1),
          { san: move.san, fen: next.fen() }
        ];
        setMoveHistory(newHist);
        setHistoryIndex(newHist.length - 1);
        setSelectedSquare(null);
        return;
      }
    }

    const piece = game.get(square);
    if (piece && piece.color === game.turn()) {
      setSelectedSquare(square);
    } else {
      setSelectedSquare(null);
    }
  }

  function playCandidateMove(san: string) {
    try {
      const next = new Chess(game.fen());
      const move = next.move(san);
      if (move) {
        setGame(next);
        const newHist = [
          ...moveHistory.slice(0, historyIndex + 1),
          { san: move.san, fen: next.fen() }
        ];
        setMoveHistory(newHist);
        setHistoryIndex(newHist.length - 1);
        setSelectedSquare(null);
      }
    } catch (_e) {
      // invalid move
    }
  }

  function resetBoard() {
    const g = new Chess();
    setGame(g);
    setSelectedSquare(null);
    setMoveHistory([]);
    setHistoryIndex(-1);
  }

  function stepHistory(step: number) {
    const targetIdx = historyIndex + step;
    if (targetIdx < -1 || targetIdx >= moveHistory.length) return;
    if (targetIdx === -1) {
      setGame(new Chess());
      setHistoryIndex(-1);
    } else {
      setGame(new Chess(moveHistory[targetIdx].fen));
      setHistoryIndex(targetIdx);
    }
    setSelectedSquare(null);
  }

  function loadPreset(fen: string) {
    try {
      const g = new Chess(fen);
      setGame(g);
      setSelectedSquare(null);
      setMoveHistory([]);
      setHistoryIndex(-1);
    } catch (_e) {
      //
    }
  }

  function copyCurrentFen() {
    navigator.clipboard.writeText(game.fen());
    setCopiedFen(true);
    setTimeout(() => setCopiedFen(false), 2000);
  }

  return (
    <div className="lichess-explorer-root">
      {/* Top Banner & Header */}
      <div className="lichess-header">
        <div className="lichess-header-left">
          <div className="lichess-brand-badge">
            <Database className="w-5 h-5 text-amber-400" />
            <span>Lichess Opening & Master Database</span>
          </div>
          <p className="lichess-subtitle">
            Connected to Lichess.org: explore 1.5+ billion games, master openings, win percentages, tablebases, and drill any line in Train mode.
          </p>
        </div>

        <div className="lichess-header-actions">
          {onPracticePosition && (
            <button
              type="button"
              className="lichess-btn-train"
              onClick={() =>
                onPracticePosition(
                  game.fen(),
                  openingStats?.name || "Opening Repertoire Drill",
                  `Find the strongest theoretical move for ${openingStats?.name || "this position"} from the Lichess database.`
                )
              }
              title="Redirect to Train mode to drill this position"
            >
              <Play className="w-4 h-4 mr-1.5" />
              <span>Train in Train Mode</span>
            </button>
          )}

          <a
            href="https://lichess.org/opening"
            target="_blank"
            rel="noopener noreferrer"
            className="lichess-btn-external"
          >
            <span>Open on Lichess</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="lichess-tab-nav">
        <button
          type="button"
          className={`lichess-tab-btn ${subTab === "explorer" ? "active" : ""}`}
          onClick={() => setSubTab("explorer")}
        >
          <Layers className="w-4 h-4" />
          <span>Opening Explorer & Percentages</span>
        </button>

        <button
          type="button"
          className={`lichess-tab-btn ${subTab === "player" ? "active" : ""}`}
          onClick={() => setSubTab("player")}
        >
          <Search className="w-4 h-4" />
          <span>Player Database & Repertoire</span>
        </button>

        <button
          type="button"
          className={`lichess-tab-btn ${subTab === "puzzle" ? "active" : ""}`}
          onClick={() => setSubTab("puzzle")}
        >
          <Flame className="w-4 h-4 text-orange-400" />
          <span>Lichess Daily Tactical Puzzle</span>
        </button>

        <button
          type="button"
          className={`lichess-tab-btn ${subTab === "import" ? "active" : ""}`}
          onClick={() => setSubTab("import")}
        >
          <Globe className="w-4 h-4" />
          <span>Import Lichess Game</span>
        </button>
      </div>

      {/* Two-Column Workspace */}
      <div className="lichess-workspace-grid">
        {/* Left Column: Interactive Chessboard */}
        <div className="lichess-board-card">
          <div className="lichess-board-toolbar">
            <div className="lichess-board-title">
              <span className="font-semibold text-zinc-100">Interactive Board</span>
              <span className="text-xs text-zinc-400 ml-2 font-mono">
                {game.turn() === "w" ? "White to move" : "Black to move"}
              </span>
            </div>

            <div className="lichess-board-controls">
              <button
                type="button"
                className="board-action-btn"
                onClick={() => setOrientation(o => (o === "w" ? "b" : "w"))}
                title="Flip board orientation"
              >
                <ArrowLeftRight className="w-4 h-4" />
                <span>Flip</span>
              </button>
              <button
                type="button"
                className="board-action-btn"
                onClick={resetBoard}
                title="Reset board to starting position"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset</span>
              </button>
              <button
                type="button"
                className="board-action-btn"
                onClick={copyCurrentFen}
                title="Copy position FEN"
              >
                {copiedFen ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                <span>{copiedFen ? "Copied" : "FEN"}</span>
              </button>
            </div>
          </div>

          {/* Chessboard View */}
          <div className="board-wrap">
            <div className="board-shell">
              <div className="board" role="grid" aria-label="Lichess Interactive Chessboard">
                {(orientation === "w" ? ranks : [...ranks].reverse()).map(rank => (
                  <React.Fragment key={rank}>
                    {(orientation === "w" ? files : [...files].reverse()).map((file, colIndex) => {
                      const square = `${file}${rank}` as Square;
                      const piece = game.get(square);
                      const isLight = (file.charCodeAt(0) - 97 + rank) % 2 === 1;
                      const isSelected = selectedSquare === square;
                      const isTarget = legalTargets.has(square);

                      return (
                        <button
                          key={square}
                          type="button"
                          className={`square ${isLight ? "light" : "dark"} ${isSelected ? "selected" : ""} ${isTarget ? "legal-target" : ""}`}
                          onClick={() => clickSquare(square)}
                          aria-label={`${file}${rank} ${piece ? `${piece.color} ${piece.type}` : "empty"}`}
                        >
                          <div className="square-shine" />
                          {piece && <ChessPiece color={piece.color} type={piece.type} />}
                          {isTarget && !piece && <span className="target-dot" />}
                          {isTarget && piece && <span className="capture-ring" />}

                          {/* Coordinates */}
                          {rank === (orientation === "w" ? 1 : 8) && (
                            <span className="coord coord-file">{file}</span>
                          )}
                          {colIndex === 0 && (
                            <span className="coord coord-rank">{rank}</span>
                          )}
                        </button>
                      );
                    })}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>

          {/* Move History & Navigation Toolbar */}
          <div className="lichess-history-strip">
            <button
              type="button"
              className="strip-nav-btn"
              onClick={() => stepHistory(-1)}
              disabled={historyIndex < 0}
              title="Previous Move"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="strip-moves-container">
              {moveHistory.length === 0 ? (
                <span className="text-xs text-zinc-500 italic">No moves played yet</span>
              ) : (
                moveHistory.map((h, i) => (
                  <span
                    key={i}
                    className={`strip-move-pill ${i === historyIndex ? "active" : ""}`}
                    onClick={() => {
                      setGame(new Chess(h.fen));
                      setHistoryIndex(i);
                    }}
                  >
                    {i % 2 === 0 ? `${Math.floor(i / 2) + 1}. ` : ""}
                    {h.san}
                  </span>
                ))
              )}
            </div>

            <button
              type="button"
              className="strip-nav-btn"
              onClick={() => stepHistory(1)}
              disabled={historyIndex >= moveHistory.length - 1}
              title="Next Move"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Preset Openings */}
          <div className="lichess-presets-bar">
            <span className="text-xs text-zinc-400 font-medium">Quick Openings:</span>
            <div className="preset-chips">
              {presetOpenings.map(po => (
                <button
                  key={po.name}
                  type="button"
                  className="preset-chip"
                  onClick={() => loadPreset(po.fen)}
                >
                  {po.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Dynamic Data Panels */}
        <div className="lichess-data-column">
          {subTab === "explorer" && (
            <div className="lichess-explorer-panel">
              {/* Position Header & ECO Badge */}
              <div className="opening-hero-card">
                <div className="opening-hero-top">
                  <span className="eco-badge">{openingStats?.eco || "A00"}</span>
                  <div className="opening-titles">
                    <h3 className="opening-main-title">{openingStats?.name || "Opening Explorer"}</h3>
                    {openingStats?.variation && (
                      <span className="opening-variation-text">{openingStats.variation}</span>
                    )}
                  </div>
                  <div className="source-indicator">
                    <span
                      className={`status-dot ${isOnlineApi ? "online" : "cached"}`}
                      title={isOnlineApi ? "Direct Lichess API" : "Lichess Opening Book Database"}
                    />
                    <span className="text-xs text-zinc-400 font-mono">
                      {isOnlineApi ? "Lichess Live" : "Lichess Book"}
                    </span>
                  </div>
                </div>

                {/* Win Rates Overall Bar */}
                {openingStats && (
                  <div className="opening-stats-summary">
                    <div className="stats-metric-row">
                      <span className="metric-label">
                        <strong>{(openingStats.totalGames).toLocaleString()}</strong> games played
                      </span>
                      <div className="pct-breakdown-text">
                        <span className="text-emerald-400 font-semibold">{openingStats.whiteWinPct}% White</span>
                        <span className="text-zinc-400 mx-1">·</span>
                        <span className="text-zinc-300 font-semibold">{openingStats.drawPct}% Draw</span>
                        <span className="text-zinc-400 mx-1">·</span>
                        <span className="text-rose-400 font-semibold">{openingStats.blackWinPct}% Black</span>
                      </div>
                    </div>

                    <div className="tri-color-bar">
                      <div
                        className="bar-slice white-slice"
                        style={{ width: `${openingStats.whiteWinPct}%` }}
                        title={`White win: ${openingStats.white.toLocaleString()} (${openingStats.whiteWinPct}%)`}
                      />
                      <div
                        className="bar-slice draw-slice"
                        style={{ width: `${openingStats.drawPct}%` }}
                        title={`Draw: ${openingStats.draws.toLocaleString()} (${openingStats.drawPct}%)`}
                      />
                      <div
                        className="bar-slice black-slice"
                        style={{ width: `${openingStats.blackWinPct}%` }}
                        title={`Black win: ${openingStats.black.toLocaleString()} (${openingStats.blackWinPct}%)`}
                      />
                    </div>
                  </div>
                )}

                {/* Database Source Switcher & Filters */}
                <div className="explorer-filter-controls">
                  <div className="source-toggle-group">
                    <button
                      type="button"
                      className={`source-toggle-btn ${dbSource === "lichess" ? "active" : ""}`}
                      onClick={() => setDbSource("lichess")}
                    >
                      Lichess Games (1.5B+)
                    </button>
                    <button
                      type="button"
                      className={`source-toggle-btn ${dbSource === "masters" ? "active" : ""}`}
                      onClick={() => setDbSource("masters")}
                    >
                      Masters (FIDE 2200+)
                    </button>
                  </div>
                </div>
              </div>

              {/* Syzygy Tablebase Banner (when <= 7 pieces) */}
              {tablebase && (
                <div className="tablebase-card">
                  <div className="tablebase-header">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    <strong>Lichess Syzygy 7-Piece Endgame Tablebase</strong>
                  </div>
                  <div className="tablebase-body">
                    <div className="tablebase-result-badge">
                      <span className={`eval-pill ${tablebase.category}`}>
                        {tablebase.category.toUpperCase()}
                        {tablebase.dtm ? ` in ${Math.abs(tablebase.dtm)} moves` : ""}
                      </span>
                    </div>
                    {tablebase.moves.length > 0 && (
                      <div className="tablebase-moves-list">
                        <span className="text-xs text-zinc-400">Best Tablebase Continuations:</span>
                        <div className="tablebase-chips">
                          {tablebase.moves.slice(0, 5).map((tm: LichessTablebaseMove, idx: number) => (
                            <button
                              key={idx}
                              type="button"
                              className="tablebase-chip"
                              onClick={() => playCandidateMove(tm.san)}
                            >
                              <strong>{tm.san}</strong>
                              <span className="text-[10px] text-zinc-400 ml-1">
                                {tm.category} {tm.dtm ? `(M${Math.abs(tm.dtm)})` : ""}
                              </span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Candidate Moves Table */}
              <div className="candidate-moves-card">
                <div className="card-topline">
                  <h4 className="font-semibold text-zinc-200 text-sm">Lichess Database Candidate Moves</h4>
                  {isStatsLoading && <span className="text-xs text-amber-400 animate-pulse">Loading database...</span>}
                </div>

                {openingStats && openingStats.moves.length > 0 ? (
                  <div className="moves-table-container">
                    <table className="moves-table">
                      <thead>
                        <tr>
                          <th>Move</th>
                          <th>Games</th>
                          <th style={{ width: "38%" }}>Win Rate %</th>
                          <th>White</th>
                          <th>Draw</th>
                          <th>Black</th>
                        </tr>
                      </thead>
                      <tbody>
                        {openingStats.moves.map((m: CandidateMove) => (
                          <tr
                            key={m.san}
                            className="move-row"
                            onClick={() => playCandidateMove(m.san)}
                            title={`Play ${m.san} on board`}
                          >
                            <td className="font-mono font-bold text-amber-400">{m.san}</td>
                            <td className="text-xs text-zinc-300 font-mono">
                              {m.totalGames.toLocaleString()}
                            </td>
                            <td>
                              <div className="tri-color-bar mini">
                                <div
                                  className="bar-slice white-slice"
                                  style={{ width: `${m.whiteWinPct}%` }}
                                />
                                <div
                                  className="bar-slice draw-slice"
                                  style={{ width: `${m.drawPct}%` }}
                                />
                                <div
                                  className="bar-slice black-slice"
                                  style={{ width: `${m.blackWinPct}%` }}
                                />
                              </div>
                            </td>
                            <td className="text-xs text-emerald-400 font-mono font-medium">{m.whiteWinPct}%</td>
                            <td className="text-xs text-zinc-400 font-mono">{m.drawPct}%</td>
                            <td className="text-xs text-rose-400 font-mono font-medium">{m.blackWinPct}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="empty-moves-box">
                    <p className="text-xs text-zinc-400">
                      No further database book moves found for this position.
                    </p>
                  </div>
                )}
              </div>

              {/* Top Master Games in this position */}
              {openingStats && openingStats.topGames && openingStats.topGames.length > 0 && (
                <div className="master-games-card">
                  <div className="card-topline">
                    <h4 className="font-semibold text-zinc-200 text-sm">Historic Master Games in this Position</h4>
                  </div>
                  <div className="master-games-list">
                    {openingStats.topGames.map((g: MasterGame) => (
                      <div key={g.id} className="master-game-item">
                        <div className="game-players">
                          <span className="player-name">
                            {g.white.title && <span className="title-tag">{g.white.title}</span>}
                            {g.white.name} ({g.white.rating || "?"})
                          </span>
                          <span className="vs-tag">vs</span>
                          <span className="player-name">
                            {g.black.title && <span className="title-tag">{g.black.title}</span>}
                            {g.black.name} ({g.black.rating || "?"})
                          </span>
                        </div>
                        <div className="game-meta">
                          <span className="year-tag">{g.year}</span>
                          <span className={`result-tag ${g.winner}`}>
                            {g.winner === "white" ? "1-0" : g.winner === "black" ? "0-1" : "½-½"}
                          </span>
                          <a
                            href={`https://lichess.org/${g.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="external-link-btn"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SubTab 2: Player Database & Repertoire */}
          {subTab === "player" && (
            <div className="lichess-player-panel">
              <div className="player-search-card">
                <h3 className="font-semibold text-zinc-100 text-sm mb-3">Search Lichess Player Database</h3>
                <div className="player-input-row">
                  <input
                    type="text"
                    className="player-search-input"
                    placeholder="Enter Lichess username (e.g. MagnusCarlsen, Hikaru...)"
                    value={playerQuery}
                    onChange={e => setPlayerQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSearchPlayer(playerQuery)}
                  />
                  <button
                    type="button"
                    className="player-search-btn"
                    onClick={() => handleSearchPlayer(playerQuery)}
                    disabled={isPlayerLoading}
                  >
                    <Search className="w-4 h-4 mr-1.5" />
                    <span>Search</span>
                  </button>
                </div>

                {playerError && (
                  <p className="text-xs text-rose-400 mt-2">{playerError}</p>
                )}
              </div>

              {/* Player Profile Summary */}
              {playerProfile && (
                <div className="player-profile-card">
                  <div className="profile-topline">
                    <div className="profile-identity">
                      {playerProfile.title && (
                        <span className="profile-title-badge">{playerProfile.title}</span>
                      )}
                      <strong className="profile-username">{playerProfile.username}</strong>
                      {playerProfile.online && (
                        <span className="online-tag">Online</span>
                      )}
                    </div>
                    <a
                      href={playerProfile.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="profile-link"
                    >
                      <span>Lichess Profile</span>
                      <ExternalLink className="w-3 h-3 ml-1" />
                    </a>
                  </div>

                  {/* Ratings Grid */}
                  <div className="ratings-grid">
                    <div className="rating-card">
                      <span className="rating-type">Blitz</span>
                      <strong className="rating-val">{playerProfile.perfs?.blitz?.rating || "—"}</strong>
                      <small className="rating-count">{playerProfile.perfs?.blitz?.games || 0} games</small>
                    </div>
                    <div className="rating-card">
                      <span className="rating-type">Rapid</span>
                      <strong className="rating-val">{playerProfile.perfs?.rapid?.rating || "—"}</strong>
                      <small className="rating-count">{playerProfile.perfs?.rapid?.games || 0} games</small>
                    </div>
                    <div className="rating-card">
                      <span className="rating-type">Bullet</span>
                      <strong className="rating-val">{playerProfile.perfs?.bullet?.rating || "—"}</strong>
                      <small className="rating-count">{playerProfile.perfs?.bullet?.games || 0} games</small>
                    </div>
                    <div className="rating-card">
                      <span className="rating-type">Puzzle</span>
                      <strong className="rating-val">{playerProfile.perfs?.puzzle?.rating || "—"}</strong>
                      <small className="rating-count">{playerProfile.perfs?.puzzle?.games || 0} solved</small>
                    </div>
                  </div>

                  {/* Recent Games List */}
                  <div className="player-games-section">
                    <h4 className="font-semibold text-zinc-200 text-xs mb-2">Recent Games on Lichess</h4>
                    <div className="games-scroll-list">
                      {playerGames.map(pg => {
                        const isWhite =
                          pg.players.white.user?.name.toLowerCase() === playerProfile.username.toLowerCase();
                        const opponent = isWhite ? pg.players.black : pg.players.white;
                        const result =
                          pg.winner === (isWhite ? "white" : "black")
                            ? "win"
                            : pg.winner === "draw"
                            ? "draw"
                            : "loss";

                        return (
                          <div key={pg.id} className="player-game-row">
                            <div className="game-speed-badge">{pg.speed}</div>
                            <div className="game-opp-info">
                              <span className="text-zinc-200 text-xs font-medium">
                                vs {opponent.user?.name || "Anonymous"} ({opponent.rating || "?"})
                              </span>
                              {pg.opening && (
                                <span className="text-[11px] text-zinc-400 block truncate">
                                  {pg.opening.name}
                                </span>
                              )}
                            </div>
                            <span className={`game-result-badge ${result}`}>
                              {result.toUpperCase()}
                            </span>
                            <button
                              type="button"
                              className="load-game-btn"
                              onClick={() => {
                                setImportQuery(pg.id);
                                setSubTab("import");
                              }}
                              title="Load Game moves into Explorer"
                            >
                              Load
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SubTab 3: Daily Tactical Puzzle */}
          {subTab === "puzzle" && (
            <div className="lichess-puzzle-panel">
              <div className="puzzle-hero-card">
                <div className="puzzle-topline">
                  <div className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-400" />
                    <h3 className="font-semibold text-zinc-100">Official Lichess Daily Puzzle</h3>
                  </div>
                  <span className="puzzle-rating-pill">
                    Rating {dailyPuzzle?.rating || "1500"}
                  </span>
                </div>

                <p className="text-xs text-zinc-400 mt-1">
                  Sharpen tactical calculation with today's real puzzle from high-rated Lichess games.
                </p>

                {dailyPuzzle?.themes && (
                  <div className="puzzle-tags-row mt-3">
                    {dailyPuzzle.themes.map((t: string) => (
                      <span key={t} className="theme-tag">
                        {t}
                      </span>
                    ))}
                  </div>
                )}

                <div className="puzzle-actions-row mt-4">
                  <button
                    type="button"
                    className="puzzle-start-btn"
                    onClick={startDailyPuzzleGame}
                  >
                    <Play className="w-4 h-4 mr-1.5" />
                    <span>Load Puzzle into Interactive Board</span>
                  </button>
                  <button
                    type="button"
                    className="puzzle-refresh-btn"
                    onClick={handleLoadDailyPuzzle}
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* SubTab 4: Import Lichess Game */}
          {subTab === "import" && (
            <div className="lichess-import-panel">
              <div className="import-card">
                <h3 className="font-semibold text-zinc-100 text-sm mb-2">Import & Study Any Lichess Game</h3>
                <p className="text-xs text-zinc-400 mb-3">
                  Paste any Lichess game URL (e.g. <code>https://lichess.org/19o9Pq0s</code>) or 8-character ID. The full move sequence will be fetched from Lichess and loaded into the explorer.
                </p>

                <div className="import-input-row">
                  <input
                    type="text"
                    className="import-input"
                    placeholder="https://lichess.org/abcdefgh"
                    value={importQuery}
                    onChange={e => setImportQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleImportGame()}
                  />
                  <button
                    type="button"
                    className="import-submit-btn"
                    onClick={handleImportGame}
                    disabled={importLoading}
                  >
                    {importLoading ? "Fetching..." : "Fetch & Load"}
                  </button>
                </div>

                {importError && (
                  <p className="text-xs text-rose-400 mt-2">{importError}</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
