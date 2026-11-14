import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import {
  ArrowLeft,
  ArrowLeftRight,
  Award,
  BarChart3,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Cpu,
  Download,
  ExternalLink,
  Flame,
  History,
  Link2,
  RefreshCw,
  Search,
  Settings,
  Sparkles,
  Trash2,
  Trophy,
  Upload,
  UserCheck
} from "lucide-react";
import {
  GameReviewReport,
  MOVE_QUALITY_META,
  PlyEval,
  ReviewedMove,
  buildGameReview,
  buildTrainingReport,
  computeBadges,
  winProbabilityFromScore
} from "../domain/account";
import { ChatLevel } from "../domain/bots";
import { LessonCourse, LessonProgressRecord } from "../domain/lessons";
import { OpeningTree } from "../domain/openings";
import { PuzzlePack, playerLevelFromXp } from "../domain/puzzles";
import {
  APP_THEMES,
  AppearanceMode,
  AppThemeId,
  BOARD_COLORS,
  MASCOTS,
  PIECE_SETS,
  RATING_RANKS,
  botAssetUrl,
  mascotAssetUrl,
  ratingRankOf
} from "../domain/theme";
import {
  ImportDepth,
  ImportProgressUpdate,
  computeAccountAnalytics,
  importAccountGames
} from "../lib/accountStats";
import { parsePgnSafely, parseUci, toUci, uciToSan } from "../lib/chessUtils";
import { EngineHealthReport, analyseMultiPV, runEngineHealthCheck } from "../lib/engine";
import {
  AppSettings,
  LinkedAccountInfo,
  PuzzleStoreState,
  ReviewDepthId,
  StoredAccountGame,
  TutorGameMistake,
  TutorGameRecord,
  computeDayStreak,
  exportAllLocalData,
  importAllLocalData
} from "../lib/storage";
import { BoardArrow, BoardHost } from "../components/BoardHost";

export type AccountSubRoute =
  | { view: "overview" }
  | { view: "games"; initialFilter?: string }
  | { view: "review"; gameId: string }
  | { view: "performance"; initialClock?: string }
  | { view: "training" }
  | { view: "settings" }
  | { view: "licenses" };

export function AccountView({
  route,
  setRoute,
  settings,
  onUpdateSettings,
  isDarkAppearance,
  effectiveRating,
  puzzleStore,
  puzzlePack,
  courses,
  lessonProgress,
  localGames,
  importedGames,
  linkedAccounts,
  analysedMap,
  openingTree,
  onLinkImportedAccount,
  onRemoveLinkedAccount,
  onCacheAnalysis,
  onSaveGameMistakes,
  onPractiseMistake,
  onExplorePosition,
  onTrainTheme,
  onOpenLearnCourseByName,
  onResetAllData,
  onDataImported
}: {
  route: AccountSubRoute;
  setRoute: (r: AccountSubRoute) => void;
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  isDarkAppearance: boolean;
  effectiveRating: number;
  puzzleStore: PuzzleStoreState;
  puzzlePack: PuzzlePack;
  courses: LessonCourse[];
  lessonProgress: Record<string, LessonProgressRecord>;
  localGames: TutorGameRecord[];
  importedGames: StoredAccountGame[];
  linkedAccounts: LinkedAccountInfo[];
  analysedMap: Record<string, GameReviewReport>;
  openingTree: OpeningTree;
  onLinkImportedAccount: (account: LinkedAccountInfo, games: StoredAccountGame[]) => void;
  onRemoveLinkedAccount: (platform: "lichess" | "chess.com", username: string) => void;
  onCacheAnalysis: (gameId: string, report: GameReviewReport) => void;
  onSaveGameMistakes: (mistakes: TutorGameMistake[]) => void;
  onPractiseMistake: (mistake: TutorGameMistake) => void;
  onExplorePosition: (fen: string, moves: string[]) => void;
  onTrainTheme: (theme: string) => void;
  onOpenLearnCourseByName: (name: string) => void;
  onResetAllData: () => void;
  onDataImported: () => void;
}) {
  const streak = computeDayStreak(puzzleStore.activeDays);
  const levelInfo = playerLevelFromXp(puzzleStore.totalXp);
  const rank = ratingRankOf(effectiveRating);
  const [showRankLadder, setShowRankLadder] = useState(false);

  const { lessonsDone, lessonsTotal } = useMemo(() => {
    let total = 0;
    let done = 0;
    for (const c of courses) {
      for (const l of c.lessons) {
        total++;
        if (lessonProgress[l.id]?.completed) done++;
      }
    }
    return { lessonsDone: done, lessonsTotal: total };
  }, [courses, lessonProgress]);

  const allGames: TutorGameRecord[] = useMemo(() => {
    const combined = [...localGames, ...importedGames];
    const dedup = new Map<string, TutorGameRecord>();
    for (const g of combined) {
      const k = g.id ?? `${g.source}:${g.opponent}:${g.date}:${g.moves}`;
      if (!dedup.has(k)) dedup.set(k, g);
    }
    return Array.from(dedup.values()).sort((a, b) => (b.playedAt ?? 0) - (a.playedAt ?? 0));
  }, [localGames, importedGames]);

  const badges = useMemo(
    () =>
      computeBadges({
        localGames,
        importedGames,
        analysedMap,
        puzzleHistory: puzzleStore.history,
        playerLevel: levelInfo.level,
        lessonsDone,
        lessonsTotal
      }),
    [localGames, importedGames, analysedMap, puzzleStore.history, levelInfo.level, lessonsDone, lessonsTotal]
  );

  if (route.view === "review") {
    const game = allGames.find(g => g.id === route.gameId);
    if (!game) {
      return (
        <div className="ct-page">
          <button type="button" className="ct-icon-btn" onClick={() => setRoute({ view: "games" })}>
            <ArrowLeft size={18} /> <span>Games</span>
          </button>
          <div className="ct-card">
            <p className="ct-muted">Game record not found.</p>
          </div>
        </div>
      );
    }
    return (
      <GameReviewView
        game={game}
        settings={settings}
        openingTree={openingTree}
        cachedReport={game.id ? analysedMap[game.id] : undefined}
        onBack={() => setRoute({ view: "games" })}
        onCacheReport={rep => game.id && onCacheAnalysis(game.id, rep)}
        onSaveMistakes={onSaveGameMistakes}
        onPractiseMistake={onPractiseMistake}
        onExplorePosition={onExplorePosition}
      />
    );
  }

  if (route.view === "games") {
    return (
      <GamesListPage
        games={allGames}
        analysedMap={analysedMap}
        initialFilter={route.initialFilter}
        onBack={() => setRoute({ view: "overview" })}
        onOpenReview={gameId => setRoute({ view: "review", gameId })}
      />
    );
  }

  if (route.view === "performance") {
    return (
      <PerformancePage
        importedGames={importedGames}
        allGames={allGames}
        analysedMap={analysedMap}
        initialClock={route.initialClock}
        onBack={() => setRoute({ view: "overview" })}
        onFilterGames={q => setRoute({ view: "games", initialFilter: q })}
        onOpenLearnCourse={onOpenLearnCourseByName}
      />
    );
  }

  if (route.view === "training") {
    return (
      <TrainingPage
        puzzleStore={puzzleStore}
        puzzlePack={puzzlePack}
        courses={courses}
        lessonProgress={lessonProgress}
        lessonsDone={lessonsDone}
        lessonsTotal={lessonsTotal}
        onBack={() => setRoute({ view: "overview" })}
        onTrainTheme={onTrainTheme}
      />
    );
  }

  if (route.view === "licenses") {
    return <LicencesPage onBack={() => setRoute({ view: "settings" })} />;
  }

  if (route.view === "settings") {
    return (
      <SettingsPage
        settings={settings}
        onUpdateSettings={onUpdateSettings}
        onBack={() => setRoute({ view: "overview" })}
        onOpenLicences={() => setRoute({ view: "licenses" })}
        onResetAllData={onResetAllData}
        onDataImported={onDataImported}
      />
    );
  }

  // Account Overview
  const mergedRatings = {
    bullet: linkedAccounts.find(a => a.ratings.bullet)?.ratings.bullet,
    blitz: linkedAccounts.find(a => a.ratings.blitz)?.ratings.blitz,
    rapid: linkedAccounts.find(a => a.ratings.rapid)?.ratings.rapid,
    classical: linkedAccounts.find(a => a.ratings.classical)?.ratings.classical
  };

  return (
    <div className="ct-page">
      <header className="ct-page-header">
        <div>
          <div className="ct-eyebrow">PROFILE</div>
          <h1>Account</h1>
        </div>
        <button type="button" className="ct-btn ct-btn-secondary" onClick={() => setRoute({ view: "settings" })}>
          <Settings size={16} /> Settings
        </button>
      </header>

      {/* Sub-navigation Strip */}
      <div className="ct-chip-wrap" style={{ marginBottom: 18 }}>
        <button type="button" className="ct-chip-btn is-active" onClick={() => setRoute({ view: "overview" })}>
          Overview
        </button>
        <button type="button" className="ct-chip-btn" onClick={() => setRoute({ view: "games" })}>
          Games ({allGames.length})
        </button>
        <button type="button" className="ct-chip-btn" onClick={() => setRoute({ view: "performance" })}>
          Performance
        </button>
        <button type="button" className="ct-chip-btn" onClick={() => setRoute({ view: "training" })}>
          Training
        </button>
      </div>

      {/* Hero Card with 3D Rank Piece */}
      <div className="ct-hero-card">
        <div className="ct-hero-copy">
          <div className="ct-kicker">
            Level {levelInfo.level} · {rank.label} Rank
          </div>
          <h2>{settings.playerName || "Chess Learner"}</h2>
          <div className="ct-badge-row">
            <span className="ct-pill-tag mono-num">Rating {effectiveRating}</span>
            <span className="ct-pill-tag mono-num">
              <Flame size={13} className="ct-accent-text" /> {streak} day streak
            </span>
            <span className="ct-pill-tag mono-num">{puzzleStore.totalXp} XP</span>
          </div>
          <div className="ct-btn-row" style={{ marginTop: 10 }}>
            <button type="button" className="ct-btn ct-btn-secondary" onClick={() => setShowRankLadder(s => !s)}>
              <Trophy size={15} /> {showRankLadder ? "Hide Rank Ladder" : "Rank Ladder"}
            </button>
          </div>
        </div>
        <img
          src={isDarkAppearance ? rank.artNight : rank.artDay}
          alt={rank.label}
          className="ct-hero-bot-img"
        />
      </div>

      {showRankLadder && (
        <div className="ct-card ct-section">
          <div className="ct-card-head">
            <strong>Rank Ladder</strong>
            <small className="ct-muted">Based on your active rating ({effectiveRating})</small>
          </div>
          <div className="ct-rank-ladder">
            {RATING_RANKS.map(r => (
              <div key={r.id} className={`ct-rank-item ${r.id === rank.id ? "is-current" : ""}`}>
                <img src={isDarkAppearance ? r.artNight : r.artDay} alt={r.label} />
                <strong>{r.label}</strong>
                <small className="mono-num">{r.from}+</small>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Linked Chess.com / Lichess Accounts */}
      <LinkedAccountsCard
        linkedAccounts={linkedAccounts}
        onLinkImported={onLinkImportedAccount}
        onRemove={onRemoveLinkedAccount}
      />

      {/* Rating Cards */}
      <section className="ct-section">
        <h2>Ratings</h2>
        <div className="ct-stats-4grid">
          {(["rapid", "blitz", "bullet", "classical"] as const).map(clock => (
            <button
              key={clock}
              type="button"
              className="ct-stat-tile"
              onClick={() => setRoute({ view: "performance", initialClock: clock })}
            >
              <small className="ct-kicker">{clock}</small>
              <strong className="mono-num">{mergedRatings[clock] ?? "—"}</strong>
              <span className="ct-muted">View stats</span>
            </button>
          ))}
          <button type="button" className="ct-stat-tile" onClick={() => setRoute({ view: "training" })}>
            <small className="ct-kicker">Puzzles</small>
            <strong className="mono-num">{puzzleStore.puzzleRating}</strong>
            <span className="ct-muted">{puzzleStore.history.length} played</span>
          </button>
        </div>
      </section>

      {/* Recent Games Preview */}
      <section className="ct-section">
        <div className="ct-section-head">
          <h2>Recent Games</h2>
          <button type="button" className="ct-text-btn" onClick={() => setRoute({ view: "games" })}>
            See all ({allGames.length}) <ChevronRight size={15} />
          </button>
        </div>
        {allGames.length === 0 ? (
          <div className="ct-card">
            <p className="ct-muted">
              Play a bot on Home or link a Chess.com / Lichess account above to review your games with Stockfish.
            </p>
          </div>
        ) : (
          <div className="ct-game-list">
            {allGames.slice(0, 4).map(g => (
              <GameRow
                key={g.id}
                game={g}
                report={g.id ? analysedMap[g.id] : undefined}
                onClick={() => g.id && setRoute({ view: "review", gameId: g.id })}
              />
            ))}
          </div>
        )}
      </section>

      {/* 16 Achievement Badges */}
      <section className="ct-section">
        <div className="ct-section-head">
          <h2>Badges</h2>
          <span className="mono-num ct-muted">
            {badges.filter(b => b.earned).length}/{badges.length} earned
          </span>
        </div>
        <div className="ct-badges-grid">
          {badges.map(b => (
            <div key={b.id} className={`ct-badge-card ${b.earned ? "is-earned" : "is-locked"}`}>
              <img src={b.medalArt} alt={b.title} className="ct-badge-medal" />
              <div className="ct-badge-body">
                <strong>{b.title}</strong>
                <small className="ct-muted">{b.detail}</small>
                <div className="ct-progress-track">
                  <div
                    className="ct-progress-fill"
                    style={{ width: `${Math.round((b.progress / Math.max(1, b.goal)) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ==========================================================================
   Linked Accounts Importer
   ========================================================================== */

function LinkedAccountsCard({
  linkedAccounts,
  onLinkImported,
  onRemove
}: {
  linkedAccounts: LinkedAccountInfo[];
  onLinkImported: (account: LinkedAccountInfo, games: StoredAccountGame[]) => void;
  onRemove: (platform: "lichess" | "chess.com", username: string) => void;
}) {
  const [platform, setPlatform] = useState<"lichess" | "chess.com">("lichess");
  const [username, setUsername] = useState("");
  const [depth, setDepth] = useState<ImportDepth>(100);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<ImportProgressUpdate | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const runImport = async (targetPlatform: "lichess" | "chess.com", targetUser: string, d: ImportDepth) => {
    if (!targetUser.trim()) {
      setError("Enter a username first.");
      return;
    }
    abortRef.current?.abort();
    const ac = new AbortController();
    abortRef.current = ac;
    setBusy(true);
    setError(null);
    setProgress({ imported: 0, target: d, phase: "Connecting…", incompleteCount: 0 });

    try {
      const res = await importAccountGames(targetPlatform, targetUser.trim(), {
        depth: d,
        signal: ac.signal,
        onProgress: p => setProgress(p)
      });
      onLinkImported(
        {
          platform: res.profile.platform,
          username: res.profile.username,
          title: res.profile.title,
          avatar: res.profile.avatar,
          ratings: res.profile.ratings,
          lastSyncedAt: Date.now(),
          depthSynced: d,
          totalSynced: res.games.length,
          incompleteCount: res.incompleteCount
        },
        res.games
      );
      setUsername("");
    } catch (err: unknown) {
      if ((err as Error)?.name !== "AbortError") {
        setError(err instanceof Error ? err.message : "Import failed.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="ct-section">
      <div className="ct-card">
        <div className="ct-card-head">
          <strong>
            <Link2 size={16} /> Linked Chess Accounts
          </strong>
          <small className="ct-muted">Stored only in your browser</small>
        </div>

        {linkedAccounts.length > 0 && (
          <div className="ct-linked-list">
            {linkedAccounts.map(acc => (
              <div key={`${acc.platform}:${acc.username}`} className="ct-linked-row">
                <div>
                  <strong>
                    {acc.platform === "lichess" ? "Lichess" : "Chess.com"} · @{acc.username}
                  </strong>
                  <small className="ct-muted">
                    {acc.totalSynced} games synced · Rapid {acc.ratings.rapid ?? "—"} · Blitz {acc.ratings.blitz ?? "—"}
                  </small>
                </div>
                <div className="ct-btn-row">
                  <button
                    type="button"
                    className="ct-mini-btn"
                    disabled={busy}
                    onClick={() => runImport(acc.platform, acc.username, depth)}
                    title="Sync latest games"
                  >
                    <RefreshCw size={14} />
                  </button>
                  <button
                    type="button"
                    className="ct-mini-btn"
                    disabled={busy}
                    onClick={() => onRemove(acc.platform, acc.username)}
                    title="Unlink account"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="ct-link-form">
          <div className="ct-segmented" style={{ maxWidth: 240 }}>
            <button
              type="button"
              className={platform === "lichess" ? "is-active" : ""}
              onClick={() => setPlatform("lichess")}
            >
              Lichess
            </button>
            <button
              type="button"
              className={platform === "chess.com" ? "is-active" : ""}
              onClick={() => setPlatform("chess.com")}
            >
              Chess.com
            </button>
          </div>

          <div className="ct-link-input-row">
            <input
              type="text"
              placeholder={`Enter ${platform} username…`}
              value={username}
              onChange={e => setUsername(e.target.value)}
              disabled={busy}
            />
            <select
              value={depth}
              onChange={e => setDepth(Number(e.target.value) as ImportDepth)}
              disabled={busy}
              aria-label="Import depth"
            >
              <option value={100}>100 games</option>
              <option value={300}>300 games</option>
              <option value={1000}>1000 games</option>
            </select>
            {busy ? (
              <button type="button" className="ct-btn ct-btn-ghost" onClick={() => abortRef.current?.abort()}>
                Cancel
              </button>
            ) : (
              <button
                type="button"
                className="ct-btn ct-btn-primary"
                onClick={() => runImport(platform, username, depth)}
              >
                Import
              </button>
            )}
          </div>

          {busy && progress && (
            <div className="ct-import-progress">
              <small className="ct-muted">{progress.phase}</small>
              <div className="ct-progress-track">
                <div
                  className="ct-progress-fill"
                  style={{ width: `${Math.min(100, Math.round((progress.imported / Math.max(1, progress.target)) * 100))}%` }}
                />
              </div>
            </div>
          )}

          {error && <p className="ct-error-text">{error}</p>}
        </div>
      </div>
    </section>
  );
}

/* ==========================================================================
   Games List Page & Row
   ========================================================================== */

function GameRow({
  game,
  report,
  onClick
}: {
  game: TutorGameRecord;
  report?: GameReviewReport;
  onClick: () => void;
}) {
  const playerSide = game.playerColor ?? "w";
  const acc = report ? (playerSide === "w" ? report.whiteAccuracy : report.blackAccuracy) : game.accuracy ?? null;

  return (
    <button type="button" className="ct-game-row" onClick={onClick}>
      <span className={`ct-result-pill is-${game.result.toLowerCase()}`}>{game.result}</span>
      <div className="ct-game-row-main">
        <div className="ct-game-row-top">
          <strong>vs {game.opponent}</strong>
          <span className="mono-num ct-muted">({game.rating})</span>
          <span className="ct-pill-tag">{game.source ?? "arena"}</span>
        </div>
        <small className="ct-muted">
          {game.eco ? `${game.eco} · ` : ""}
          {game.opening} · {game.moves} moves · {game.date}
        </small>
      </div>
      {acc !== null && <span className="ct-acc-badge mono-num">{acc}%</span>}
      <ChevronRight size={17} />
    </button>
  );
}

function GamesListPage({
  games,
  analysedMap,
  initialFilter = "",
  onBack,
  onOpenReview
}: {
  games: TutorGameRecord[];
  analysedMap: Record<string, GameReviewReport>;
  initialFilter?: string;
  onBack: () => void;
  onOpenReview: (gameId: string) => void;
}) {
  const [source, setSource] = useState<"all" | "arena" | "chess.com" | "lichess">("all");
  const [result, setResult] = useState<"all" | "W" | "L" | "D">("all");
  const [side, setSide] = useState<"all" | "w" | "b">("all");
  const [query, setQuery] = useState(initialFilter);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return games.filter(g => {
      if (source !== "all" && (g.source ?? "arena") !== source) return false;
      if (result !== "all" && g.result !== result) return false;
      if (side !== "all" && (g.playerColor ?? "w") !== side) return false;
      if (q) {
        return (
          g.opponent.toLowerCase().includes(q) ||
          g.opening.toLowerCase().includes(q) ||
          (g.eco ?? "").toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [games, source, result, side, query]);

  return (
    <div className="ct-page">
      <div className="ct-subpage-bar">
        <button type="button" className="ct-icon-btn" onClick={onBack}>
          <ArrowLeft size={18} /> <span>Account</span>
        </button>
        <h1>All Games ({filtered.length})</h1>
      </div>

      <div className="ct-filter-toolbar">
        <div className="ct-search-box">
          <Search size={16} />
          <input
            type="search"
            placeholder="Filter by opponent, opening, or ECO…"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
        </div>
        <div className="ct-chip-wrap">
          {(["all", "arena", "chess.com", "lichess"] as const).map(s => (
            <button
              key={s}
              type="button"
              className={`ct-chip-btn ${source === s ? "is-active" : ""}`}
              onClick={() => setSource(s)}
            >
              {s === "all" ? "All sources" : s === "arena" ? "This app" : s}
            </button>
          ))}
          {(["all", "W", "D", "L"] as const).map(r => (
            <button
              key={r}
              type="button"
              className={`ct-chip-btn ${result === r ? "is-active" : ""}`}
              onClick={() => setResult(r)}
            >
              {r === "all" ? "Any result" : r === "W" ? "Wins" : r === "L" ? "Losses" : "Draws"}
            </button>
          ))}
          {(["all", "w", "b"] as const).map(c => (
            <button
              key={c}
              type="button"
              className={`ct-chip-btn ${side === c ? "is-active" : ""}`}
              onClick={() => setSide(c)}
            >
              {c === "all" ? "Both colors" : c === "w" ? "White" : "Black"}
            </button>
          ))}
        </div>
      </div>

      <div className="ct-game-list">
        {filtered.length === 0 ? (
          <div className="ct-card">
            <p className="ct-muted">No games match these filters.</p>
          </div>
        ) : (
          filtered.slice(0, 120).map(g => (
            <GameRow
              key={g.id}
              game={g}
              report={g.id ? analysedMap[g.id] : undefined}
              onClick={() => g.id && onOpenReview(g.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

/* ==========================================================================
   Game Review View (Background MultiPV Stockfish Analysis + Eval Graph)
   ========================================================================== */

function GameReviewView({
  game,
  settings,
  openingTree,
  cachedReport,
  onBack,
  onCacheReport,
  onSaveMistakes,
  onPractiseMistake,
  onExplorePosition
}: {
  game: TutorGameRecord;
  settings: AppSettings;
  openingTree: OpeningTree;
  cachedReport?: GameReviewReport;
  onBack: () => void;
  onCacheReport: (rep: GameReviewReport) => void;
  onSaveMistakes: (mistakes: TutorGameMistake[]) => void;
  onPractiseMistake: (mistake: TutorGameMistake) => void;
  onExplorePosition: (fen: string, moves: string[]) => void;
}) {
  const playerSide: "w" | "b" = game.playerColor ?? "w";
  const [orientation, setOrientation] = useState<"w" | "b">(playerSide);
  const [ply, setPly] = useState(0);
  const [report, setReport] = useState<GameReviewReport | null>(cachedReport ?? null);
  const [analysing, setAnalysing] = useState(false);
  const [progressText, setProgressText] = useState<string>("");
  const cancelRef = useRef(false);

  const parsed = useMemo(() => {
    const p = parsePgnSafely(game.pgn ?? "");
    const c = new Chess();
    const fens: string[] = [c.fen()];
    const uciMoves: string[] = [];
    const sans: string[] = [];
    for (const m of p.moves) {
      const played = c.move(m.san);
      if (!played) break;
      uciMoves.push(toUci(played));
      sans.push(played.san);
      fens.push(c.fen());
    }
    return { fens, uciMoves, sans };
  }, [game.pgn]);

  const openingMatch = useMemo(() => openingTree.match(parsed.uciMoves), [openingTree, parsed.uciMoves]);

  useEffect(() => {
    setReport(cachedReport ?? null);
  }, [game.id, cachedReport]);

  useEffect(() => {
    return () => {
      cancelRef.current = true;
    };
  }, []);

  const runAnalysis = async () => {
    if (analysing || parsed.uciMoves.length === 0) return;
    cancelRef.current = false;
    setAnalysing(true);
    const depth = settings.reviewDepth === "fast" ? 8 : settings.reviewDepth === "deep" ? 13 : 10;
    const evals: PlyEval[] = [];

    try {
      for (let i = 0; i < parsed.fens.length; i++) {
        if (cancelRef.current) break;
        setProgressText(`Analysing ply ${i + 1} of ${parsed.fens.length}…`);
        const lines = await analyseMultiPV(parsed.fens[i], { depth, lines: 2, skillLevel: 20 });
        const top = lines[0];
        const second = lines[1];
        evals.push({
          ply: i,
          centipawns: top?.scoreCp ?? 0,
          mate: top?.mateIn ?? null,
          bestMove: top?.firstMove ?? "",
          line: top?.moves ?? [],
          depth: top?.depth,
          secondCentipawns: second?.scoreCp ?? null,
          secondMate: second?.mateIn ?? null
        });
      }

      if (!cancelRef.current && evals.length === parsed.fens.length) {
        const built = buildGameReview(
          parsed.fens[0],
          parsed.uciMoves,
          evals,
          openingMatch.leftBookAt ?? 0,
          playerSide
        );
        setReport(built);
        onCacheReport(built);

        if (built.keyMoments.length && game.id) {
          const mistakeRecords: TutorGameMistake[] = built.keyMoments.map(km => {
            const bestSan = km.bestSan || uciToSan(km.fenBefore, km.bestMove);
            const moveNumber = Math.ceil(km.ply / 2);
            return {
              key: `${game.id}:${km.ply}`,
              gameId: game.id!,
              opponent: game.opponent,
              moveNumber,
              san: km.san,
              fen: km.fenBefore,
              category: km.phase,
              severity: km.quality === "blunder" ? "Blunder" : km.quality === "miss" ? "Mistake" : "Mistake",
              expected: km.bestMove,
              goal: `Move ${moveNumber} vs ${game.opponent}: Find the stronger continuation instead of ${km.san}`,
              hint: `Look closely at ${bestSan.replace(/[+#]/g, "")}.`,
              success: `Great find! ${bestSan} improves sharply over ${km.san}.`,
              evaluationBefore: Math.round(km.winBefore),
              evaluationAfter: Math.round(km.winAfter),
              lossCp: Math.round(km.loss * 10),
              bestLine: km.line,
              createdAt: new Date().toISOString()
            };
          });
          onSaveMistakes(mistakeRecords);
        }
      }
    } catch {
      // ignore abort
    } finally {
      setAnalysing(false);
      setProgressText("");
    }
  };

  const currentFen = parsed.fens[ply] ?? parsed.fens[0];
  const lastMoveUci = ply > 0 ? parsed.uciMoves[ply - 1] ?? null : null;
  const currentMoveInfo: ReviewedMove | undefined = report?.moves[ply - 1];
  const currentPlyEval: PlyEval | undefined = report?.evals[ply];

  const bestArrow: BoardArrow | null =
    currentMoveInfo &&
    ["inaccuracy", "miss", "mistake", "blunder"].includes(currentMoveInfo.quality) &&
    currentMoveInfo.bestMove.length >= 4
      ? { from: currentMoveInfo.bestMove.slice(0, 2), to: currentMoveInfo.bestMove.slice(2, 4), kind: "best" }
      : currentPlyEval?.bestMove && currentPlyEval.bestMove.length >= 4
      ? { from: currentPlyEval.bestMove.slice(0, 2), to: currentPlyEval.bestMove.slice(2, 4), kind: "best" }
      : null;

  const badgeOverlay =
    currentMoveInfo && lastMoveUci
      ? {
          square: lastMoveUci.slice(2, 4),
          symbol: MOVE_QUALITY_META[currentMoveInfo.quality].symbol,
          color: MOVE_QUALITY_META[currentMoveInfo.quality].color
        }
      : null;

  const convertMistakeRecord = (km: ReviewedMove): TutorGameMistake => ({
    key: `${game.id ?? "game"}:${km.ply}`,
    gameId: game.id ?? "game",
    opponent: game.opponent,
    moveNumber: Math.ceil(km.ply / 2),
    san: km.san,
    fen: km.fenBefore,
    category: km.phase,
    severity: km.quality === "blunder" ? "Blunder" : "Mistake",
    expected: km.bestMove,
    goal: `Move ${Math.ceil(km.ply / 2)} vs ${game.opponent}: Find the stronger move instead of ${km.san}`,
    hint: `Look for ${km.bestSan}.`,
    success: `${km.bestSan} is much stronger than ${km.san}.`,
    evaluationBefore: Math.round(km.winBefore),
    evaluationAfter: Math.round(km.winAfter),
    lossCp: Math.round(km.loss * 10),
    bestLine: km.line,
    createdAt: new Date().toISOString()
  });

  return (
    <div className="ct-focus-shell">
      <header className="ct-focus-topbar">
        <button type="button" className="ct-icon-btn" onClick={onBack}>
          <ArrowLeft size={18} /> <span>Games</span>
        </button>
        <div className="ct-focus-title">
          <strong>
            vs {game.opponent} ({game.rating}) · {game.result}
          </strong>
          <small>
            {openingMatch.opening ? `${openingMatch.opening.eco} · ${openingMatch.opening.name}` : game.opening}
            {openingMatch.leftBookAt !== null ? ` · Left theory ply ${openingMatch.leftBookAt}` : ""}
          </small>
        </div>
        <div className="ct-focus-actions">
          <button
            type="button"
            className="ct-icon-btn"
            onClick={() => setOrientation(o => (o === "w" ? "b" : "w"))}
            title="Flip board"
          >
            <ArrowLeftRight size={17} />
          </button>
          <button
            type="button"
            className="ct-icon-btn"
            onClick={() => onExplorePosition(currentFen, currentPlyEval?.line ?? [])}
            title="Explore position in analysis board"
          >
            <Cpu size={17} />
          </button>
        </div>
      </header>

      <div className="ct-board-workspace">
        <div className="ct-board-column">
          <BoardHost
            fen={currentFen}
            orientation={orientation}
            interactive={false}
            boardColorsId={settings.boardThemeId}
            pieceSetId={settings.pieceSetId}
            showCoordinates={settings.showCoordinates}
            reduceMotion={settings.reduceMotion}
            lastMove={lastMoveUci}
            arrows={bestArrow ? [bestArrow] : []}
            badgeOverlay={badgeOverlay}
            showEvalBar={Boolean(report)}
            evalCp={currentPlyEval?.centipawns ?? null}
            evalMate={currentPlyEval?.mate ?? null}
          />
        </div>

        <aside className="ct-side-panel">
          {!report && (
            <div className="ct-card">
              <div className="ct-card-head">
                <strong>Stockfish Game Review</strong>
                <span className="ct-pill-tag">{settings.reviewDepth}</span>
              </div>
              <p className="ct-muted">
                {analysing
                  ? progressText
                  : `Analyse all ${parsed.fens.length} positions to compute White & Black accuracy, move classifications, and key moments.`}
              </p>
              <div className="ct-btn-row">
                {analysing ? (
                  <button
                    type="button"
                    className="ct-btn ct-btn-ghost"
                    onClick={() => {
                      cancelRef.current = true;
                    }}
                  >
                    Cancel Analysis
                  </button>
                ) : (
                  <button type="button" className="ct-btn ct-btn-primary" onClick={runAnalysis}>
                    <Sparkles size={16} /> Analyse Game ({parsed.uciMoves.length} plies)
                  </button>
                )}
              </div>
            </div>
          )}

          {report && (
            <>
              {/* Accuracy Summary */}
              <div className="ct-card">
                <div className="ct-two-col-grid">
                  <div>
                    <small className="ct-kicker">White Accuracy</small>
                    <h2 className="mono-num">{report.whiteAccuracy ?? "—"}%</h2>
                  </div>
                  <div>
                    <small className="ct-kicker">Black Accuracy</small>
                    <h2 className="mono-num">{report.blackAccuracy ?? "—"}%</h2>
                  </div>
                </div>

                {/* Clickable SVG Evaluation Graph */}
                <EvalGraph
                  evals={report.evals}
                  currentPly={ply}
                  onSelectPly={p => setPly(p)}
                />

                {currentMoveInfo && (
                  <div className="ct-move-verdict">
                    <span
                      className="ct-quality-dot"
                      style={{ backgroundColor: MOVE_QUALITY_META[currentMoveInfo.quality].color }}
                    >
                      {MOVE_QUALITY_META[currentMoveInfo.quality].symbol}
                    </span>
                    <div>
                      <strong>
                        {currentMoveInfo.san} · {MOVE_QUALITY_META[currentMoveInfo.quality].label}
                      </strong>
                      {currentMoveInfo.bestMove !== currentMoveInfo.uci && currentMoveInfo.bestSan && (
                        <small className="ct-muted">Best was {currentMoveInfo.bestSan}</small>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Key Moments */}
              {report.keyMoments.length > 0 && (
                <div className="ct-card">
                  <div className="ct-kicker">Key Moments</div>
                  <div className="ct-key-moments">
                    {report.keyMoments.map(km => (
                      <div key={km.ply} className="ct-km-row">
                        <button type="button" className="ct-km-jump" onClick={() => setPly(km.ply)}>
                          <strong className="mono-num">
                            {Math.ceil(km.ply / 2)}.{km.mover === "b" ? ".." : ""} {km.san}
                          </strong>
                          <small className="ct-muted">
                            {MOVE_QUALITY_META[km.quality].label} · Best {km.bestSan}
                          </small>
                        </button>
                        <button
                          type="button"
                          className="ct-btn ct-btn-secondary"
                          onClick={() => onPractiseMistake(convertMistakeRecord(km))}
                        >
                          Practise
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Move List + Replay Bar */}
          <div className="ct-card ct-moves-card">
            <div className="ct-card-head">
              <strong>Moves ({parsed.sans.length})</strong>
              <div className="ct-replay-controls">
                <button type="button" className="ct-mini-btn" onClick={() => setPly(0)} disabled={ply === 0}>
                  |&lt;
                </button>
                <button
                  type="button"
                  className="ct-mini-btn"
                  onClick={() => setPly(p => Math.max(0, p - 1))}
                  disabled={ply === 0}
                >
                  &lt;
                </button>
                <button
                  type="button"
                  className="ct-mini-btn"
                  onClick={() => setPly(p => Math.min(parsed.fens.length - 1, p + 1))}
                  disabled={ply >= parsed.fens.length - 1}
                >
                  &gt;
                </button>
                <button
                  type="button"
                  className="ct-mini-btn"
                  onClick={() => setPly(parsed.fens.length - 1)}
                  disabled={ply >= parsed.fens.length - 1}
                >
                  &gt;|
                </button>
              </div>
            </div>
            <div className="ct-movelist">
              {parsed.sans.map((san, idx) => {
                const rm = report?.moves[idx];
                const meta = rm ? MOVE_QUALITY_META[rm.quality] : null;
                return (
                  <button
                    key={idx}
                    type="button"
                    className={`ct-move-chip mono-num ${ply === idx + 1 ? "is-current" : ""}`}
                    onClick={() => setPly(idx + 1)}
                  >
                    {idx % 2 === 0 ? `${Math.floor(idx / 2) + 1}. ` : ""}
                    {san}
                    {meta && ["inaccuracy", "miss", "mistake", "blunder", "great", "brilliant"].includes(rm!.quality) && (
                      <span style={{ color: meta.color, marginLeft: 3 }}>{meta.symbol}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function EvalGraph({
  evals,
  currentPly,
  onSelectPly
}: {
  evals: PlyEval[];
  currentPly: number;
  onSelectPly: (ply: number) => void;
}) {
  if (evals.length < 2) return null;
  const w = 320;
  const h = 76;
  const maxPly = evals.length - 1;

  const pts = evals.map((e, i) => {
    const x = (i / Math.max(1, maxPly)) * w;
    const whiteWin = winProbabilityFromScore(e.centipawns, e.mate);
    const y = h - (whiteWin / 100) * h;
    return { x, y, ply: i };
  });

  const pathD =
    `M 0 ${h / 2} ` +
    pts.map(p => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ") +
    ` L ${w} ${h} L 0 ${h} Z`;
  const curPt = pts[Math.min(pts.length - 1, currentPly)];

  return (
    <div className="ct-eval-graph-wrap">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="ct-eval-graph"
        onClick={e => {
          const rect = e.currentTarget.getBoundingClientRect();
          const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
          onSelectPly(Math.round(frac * maxPly));
        }}
      >
        <rect x={0} y={0} width={w} height={h} fill="#181c20" rx={6} />
        <path d={pathD} fill="#e8e0d2" opacity={0.85} />
        <line x1={0} y1={h / 2} x2={w} y2={h / 2} stroke="rgba(140,140,140,0.4)" strokeDasharray="3 3" />
        {curPt && <line x1={curPt.x} y1={0} x2={curPt.x} y2={h} stroke="var(--accent)" strokeWidth={2} />}
      </svg>
    </div>
  );
}

/* ==========================================================================
   Performance & Training Pages
   ========================================================================== */

function PerformancePage({
  importedGames,
  allGames,
  analysedMap,
  initialClock = "all",
  onBack,
  onFilterGames,
  onOpenLearnCourse
}: {
  importedGames: StoredAccountGame[];
  allGames: TutorGameRecord[];
  analysedMap: Record<string, GameReviewReport>;
  initialClock?: string;
  onBack: () => void;
  onFilterGames: (q: string) => void;
  onOpenLearnCourse: (name: string) => void;
}) {
  const [clock, setClock] = useState<"all" | "bullet" | "blitz" | "rapid" | "classical">(
    (["bullet", "blitz", "rapid", "classical"].includes(initialClock) ? initialClock : "all") as any
  );
  const [timeframe, setTimeframe] = useState<"all" | "30d" | "90d">("all");

  const analytics = useMemo(
    () => computeAccountAnalytics(importedGames, { timeframe, timeClass: clock, color: "all" }),
    [importedGames, timeframe, clock]
  );

  // Accuracy by phase across all analysed games
  const phaseAccuracy = useMemo(() => {
    const buckets: Record<"opening" | "middlegame" | "endgame", number[]> = {
      opening: [],
      middlegame: [],
      endgame: []
    };
    for (const g of allGames) {
      if (!g.id || !analysedMap[g.id]) continue;
      const side = g.playerColor ?? "w";
      for (const m of analysedMap[g.id].moves) {
        if (m.mover === side) buckets[m.phase].push(m.accuracy);
      }
    }
    const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : null);
    return {
      opening: avg(buckets.opening),
      middlegame: avg(buckets.middlegame),
      endgame: avg(buckets.endgame)
    };
  }, [allGames, analysedMap]);

  return (
    <div className="ct-page">
      <div className="ct-subpage-bar">
        <button type="button" className="ct-icon-btn" onClick={onBack}>
          <ArrowLeft size={18} /> <span>Account</span>
        </button>
        <h1>Performance</h1>
      </div>

      <div className="ct-chip-wrap" style={{ marginBottom: 16 }}>
        {(["all", "rapid", "blitz", "bullet", "classical"] as const).map(c => (
          <button key={c} type="button" className={`ct-chip-btn ${clock === c ? "is-active" : ""}`} onClick={() => setClock(c)}>
            {c === "all" ? "All clocks" : c.charAt(0).toUpperCase() + c.slice(1)}
          </button>
        ))}
        {(["all", "90d", "30d"] as const).map(tf => (
          <button
            key={tf}
            type="button"
            className={`ct-chip-btn ${timeframe === tf ? "is-active" : ""}`}
            onClick={() => setTimeframe(tf)}
          >
            {tf === "all" ? "All time" : tf === "90d" ? "90 days" : "30 days"}
          </button>
        ))}
      </div>

      {importedGames.length === 0 ? (
        <div className="ct-card">
          <p className="ct-muted">
            Link your Chess.com or Lichess account on the Account overview to see rating trends and opening win rates.
          </p>
        </div>
      ) : (
        <>
          <div className="ct-stats-4grid ct-section">
            <div className="ct-stat-tile">
              <small className="ct-kicker">Games</small>
              <strong className="mono-num">{analytics.totalGames}</strong>
              <span className="ct-muted">{analytics.scorePct}% score</span>
            </div>
            <div className="ct-stat-tile">
              <small className="ct-kicker">As White</small>
              <strong className="mono-num">{analytics.colorStats.white.scorePct}%</strong>
              <span className="ct-muted">
                {analytics.colorStats.white.wins}W · {analytics.colorStats.white.draws}D · {analytics.colorStats.white.losses}L
              </span>
            </div>
            <div className="ct-stat-tile">
              <small className="ct-kicker">As Black</small>
              <strong className="mono-num">{analytics.colorStats.black.scorePct}%</strong>
              <span className="ct-muted">
                {analytics.colorStats.black.wins}W · {analytics.colorStats.black.draws}D · {analytics.colorStats.black.losses}L
              </span>
            </div>
            <div className="ct-stat-tile">
              <small className="ct-kicker">Phase Accuracy</small>
              <strong className="mono-num">
                {phaseAccuracy.opening ?? "—"}% / {phaseAccuracy.middlegame ?? "—"}% / {phaseAccuracy.endgame ?? "—"}%
              </strong>
              <span className="ct-muted">Open / Mid / End</span>
            </div>
          </div>

          {analytics.ratingTrend.length > 1 && (
            <div className="ct-card ct-section">
              <div className="ct-card-head">
                <strong>Rating Trend</strong>
                <span className="mono-num ct-muted">{analytics.ratingTrend.length} games</span>
              </div>
              <LineSparkChart points={analytics.ratingTrend.map((p, i) => ({ x: i, y: p.rating }))} />
            </div>
          )}

          <div className="ct-two-col-grid ct-section">
            <div className="ct-card">
              <div className="ct-card-head">
                <strong>Openings You Play</strong>
              </div>
              <div className="ct-opening-bars">
                {analytics.openingsPlayed.slice(0, 6).map(o => (
                  <button
                    key={o.key}
                    type="button"
                    className="ct-opening-bar-row"
                    onClick={() => onFilterGames(o.name)}
                  >
                    <div className="ct-opening-bar-head">
                      <span>{o.name}</span>
                      <span className="mono-num ct-muted">
                        {o.scorePct}% ({o.games})
                      </span>
                    </div>
                    <div className="ct-wdl-bar">
                      <span className="is-w" style={{ width: `${(o.wins / o.games) * 100}%` }} />
                      <span className="is-d" style={{ width: `${(o.draws / o.games) * 100}%` }} />
                      <span className="is-l" style={{ width: `${(o.losses / o.games) * 100}%` }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="ct-card">
              <div className="ct-card-head">
                <strong>Openings You Face</strong>
              </div>
              <div className="ct-opening-bars">
                {analytics.openingsFaced.slice(0, 6).map(o => (
                  <button
                    key={o.key}
                    type="button"
                    className="ct-opening-bar-row"
                    onClick={() => onFilterGames(o.name)}
                  >
                    <div className="ct-opening-bar-head">
                      <span>{o.name}</span>
                      <span className="mono-num ct-muted">
                        {o.scorePct}% ({o.games})
                      </span>
                    </div>
                    <div className="ct-wdl-bar">
                      <span className="is-w" style={{ width: `${(o.wins / o.games) * 100}%` }} />
                      <span className="is-d" style={{ width: `${(o.draws / o.games) * 100}%` }} />
                      <span className="is-l" style={{ width: `${(o.losses / o.games) * 100}%` }} />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {analytics.insights.length > 0 && (
            <section className="ct-section">
              <h2>Actionable Insights</h2>
              <div className="ct-two-col-grid">
                {analytics.insights.map((ins, i) => (
                  <div key={i} className="ct-card">
                    <strong>{ins.title}</strong>
                    <p className="ct-muted">{ins.detail}</p>
                    {ins.actionLabel && ins.actionTarget?.openingName && (
                      <button
                        type="button"
                        className="ct-btn ct-btn-secondary"
                        onClick={() => onOpenLearnCourse(ins.actionTarget!.openingName!)}
                      >
                        {ins.actionLabel}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function TrainingPage({
  puzzleStore,
  puzzlePack,
  lessonsDone,
  lessonsTotal,
  onBack,
  onTrainTheme
}: {
  puzzleStore: PuzzleStoreState;
  puzzlePack: PuzzlePack;
  courses: LessonCourse[];
  lessonProgress: Record<string, LessonProgressRecord>;
  lessonsDone: number;
  lessonsTotal: number;
  onBack: () => void;
  onTrainTheme: (theme: string) => void;
}) {
  const report = useMemo(
    () =>
      buildTrainingReport(
        puzzleStore.history,
        id => puzzlePack.get(id)?.themes ?? [],
        lessonsDone,
        lessonsTotal
      ),
    [puzzleStore.history, puzzlePack, lessonsDone, lessonsTotal]
  );

  return (
    <div className="ct-page">
      <div className="ct-subpage-bar">
        <button type="button" className="ct-icon-btn" onClick={onBack}>
          <ArrowLeft size={18} /> <span>Account</span>
        </button>
        <h1>Training Metrics</h1>
      </div>

      <div className="ct-stats-4grid ct-section">
        <div className="ct-stat-tile">
          <small className="ct-kicker">Puzzle Rating</small>
          <strong className="mono-num">{puzzleStore.puzzleRating}</strong>
          <span className="ct-muted">{report.puzzlesPlayed} played</span>
        </div>
        <div className="ct-stat-tile">
          <small className="ct-kicker">Clean Solve Rate</small>
          <strong className="mono-num">{Math.round(report.cleanRate * 100)}%</strong>
          <span className="ct-muted">{report.cleanSolves} clean</span>
        </div>
        <div className="ct-stat-tile">
          <small className="ct-kicker">Lessons Completed</small>
          <strong className="mono-num">
            {report.lessonsDone}/{report.lessonsTotal}
          </strong>
          <span className="ct-muted">{puzzleStore.totalXp} total XP</span>
        </div>
        <div className="ct-stat-tile">
          <small className="ct-kicker">Best Rush</small>
          <strong className="mono-num">
            {puzzleStore.rushBestTimed3}/{puzzleStore.rushBestTimed5}/{puzzleStore.rushBestSurvival}
          </strong>
          <span className="ct-muted">3m / 5m / Surv</span>
        </div>
      </div>

      {report.ratingHistory.length > 1 && (
        <div className="ct-card ct-section">
          <div className="ct-card-head">
            <strong>Puzzle Rating History</strong>
          </div>
          <LineSparkChart points={report.ratingHistory.slice(-50).map((r, i) => ({ x: i, y: r.rating }))} />
        </div>
      )}

      <div className="ct-two-col-grid ct-section">
        <div className="ct-card">
          <div className="ct-card-head">
            <strong>Theme Strengths</strong>
          </div>
          {report.strengths.length === 0 ? (
            <p className="ct-muted">Solve more puzzles across themes to reveal your strengths.</p>
          ) : (
            <div className="ct-theme-score-list">
              {report.strengths.map(s => (
                <button key={s.theme} type="button" className="ct-theme-score-row" onClick={() => onTrainTheme(s.theme)}>
                  <span>{s.name}</span>
                  <strong className="mono-num">{Math.round(s.rate * 100)}%</strong>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="ct-card">
          <div className="ct-card-head">
            <strong>Weaknesses to Train</strong>
          </div>
          {report.weaknesses.length === 0 ? (
            <p className="ct-muted">No clear weak spots detected yet — tap any puzzle theme to drill more.</p>
          ) : (
            <div className="ct-theme-score-list">
              {report.weaknesses.map(s => (
                <button key={s.theme} type="button" className="ct-theme-score-row" onClick={() => onTrainTheme(s.theme)}>
                  <span>{s.name} ({s.attempts} tried)</span>
                  <strong className="mono-num">{Math.round(s.rate * 100)}%</strong>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LineSparkChart({ points }: { points: { x: number; y: number }[] }) {
  if (points.length < 2) return null;
  const w = 480;
  const h = 110;
  const pad = 12;
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));
  const span = Math.max(20, maxY - minY);

  const coords = points.map((p, i) => {
    const cx = pad + (i / (points.length - 1)) * (w - pad * 2);
    const cy = h - pad - ((p.y - minY) / span) * (h - pad * 2);
    return { cx, cy };
  });
  const d = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.cx.toFixed(1)} ${c.cy.toFixed(1)}`).join(" ");

  return (
    <div className="ct-spark-wrap">
      <svg viewBox={`0 0 ${w} ${h}`} className="ct-spark-svg">
        <path d={d} fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div className="ct-spark-labels mono-num ct-muted">
        <span>Min {minY}</span>
        <span>Latest {points[points.length - 1].y}</span>
        <span>Max {maxY}</span>
      </div>
    </div>
  );
}

/* ==========================================================================
   Settings & Open-Source Licences Pages
   ========================================================================== */

function SettingsPage({
  settings,
  onUpdateSettings,
  onBack,
  onOpenLicences,
  onResetAllData,
  onDataImported
}: {
  settings: AppSettings;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onBack: () => void;
  onOpenLicences: () => void;
  onResetAllData: () => void;
  onDataImported: () => void;
}) {
  const [health, setHealth] = useState<EngineHealthReport | null>(null);
  const [checkingEngine, setCheckingEngine] = useState(false);
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const runHealth = async () => {
    setCheckingEngine(true);
    const rep = await runEngineHealthCheck();
    setHealth(rep);
    setCheckingEngine(false);
  };

  const handleExport = () => {
    const json = exportAllLocalData();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `chess-tutor-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="ct-page">
      <div className="ct-subpage-bar">
        <button type="button" className="ct-icon-btn" onClick={onBack}>
          <ArrowLeft size={18} /> <span>Account</span>
        </button>
        <h1>Settings</h1>
      </div>

      <div className="ct-settings-grid">
        {/* Profile */}
        <div className="ct-card">
          <h2>Profile</h2>
          <label className="ct-field">
            <span>Display Name</span>
            <input
              type="text"
              maxLength={24}
              value={settings.playerName}
              placeholder="Player"
              onChange={e => onUpdateSettings({ playerName: e.target.value })}
            />
          </label>
        </div>

        {/* Look & Theme */}
        <div className="ct-card">
          <h2>App Theme &amp; Appearance</h2>
          <div className="ct-control-group">
            <label>App Palette</label>
            <div className="ct-chip-wrap">
              {APP_THEMES.map(t => (
                <button
                  key={t.id}
                  type="button"
                  className={`ct-chip-btn ${settings.appTheme === t.id ? "is-active" : ""}`}
                  onClick={() => onUpdateSettings({ appTheme: t.id as AppThemeId, boardThemeId: t.defaultBoard })}
                >
                  <span
                    className="ct-swatch-dot"
                    style={{ backgroundColor: t.swatchAccent, borderColor: t.swatchBg }}
                  />
                  {t.label}
                </button>
              ))}
            </div>
          </div>
          <div className="ct-control-group">
            <label>Appearance</label>
            <div className="ct-segmented">
              {(["system", "light", "dark"] as AppearanceMode[]).map(m => (
                <button
                  key={m}
                  type="button"
                  className={settings.appearance === m ? "is-active" : ""}
                  onClick={() => onUpdateSettings({ appearance: m })}
                >
                  {m.charAt(0).toUpperCase() + m.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Live Board & Pieces Preview */}
        <div className="ct-card ct-settings-wide">
          <h2>Board &amp; Pieces Preview</h2>
          <div className="ct-two-col-grid">
            <div>
              <BoardHost
                fen="r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4"
                orientation="w"
                interactive={false}
                boardColorsId={settings.boardThemeId}
                pieceSetId={settings.pieceSetId}
                showCoordinates={settings.showCoordinates}
                lastMove="f1c4"
                maxBoardPx={320}
              />
            </div>
            <div>
              <div className="ct-control-group">
                <label>Board Colours ({BOARD_COLORS.length})</label>
                <div className="ct-chip-wrap">
                  {BOARD_COLORS.map(b => (
                    <button
                      key={b.id}
                      type="button"
                      className={`ct-chip-btn ${settings.boardThemeId === b.id ? "is-active" : ""}`}
                      onClick={() => onUpdateSettings({ boardThemeId: b.id })}
                    >
                      <span
                        className="ct-swatch-pair"
                        style={{ background: `linear-gradient(135deg, ${b.light} 50%, ${b.dark} 50%)` }}
                      />
                      {b.displayName}
                    </button>
                  ))}
                </div>
              </div>

              <div className="ct-control-group">
                <label>Piece Set</label>
                <div className="ct-segmented">
                  {PIECE_SETS.map(ps => (
                    <button
                      key={ps.id}
                      type="button"
                      className={settings.pieceSetId === ps.id ? "is-active" : ""}
                      onClick={() => onUpdateSettings({ pieceSetId: ps.id })}
                    >
                      {ps.displayName}
                    </button>
                  ))}
                </div>
              </div>

              <div className="ct-toggle-list">
                <label className="ct-toggle-row">
                  <span>Show board coordinates</span>
                  <input
                    type="checkbox"
                    checked={settings.showCoordinates}
                    onChange={e => onUpdateSettings({ showCoordinates: e.target.checked })}
                  />
                </label>
                <label className="ct-toggle-row">
                  <span>Show legal move dots</span>
                  <input
                    type="checkbox"
                    checked={settings.showLegalDots}
                    onChange={e => onUpdateSettings({ showLegalDots: e.target.checked })}
                  />
                </label>
                <label className="ct-toggle-row">
                  <span>Always auto-queen promotions</span>
                  <input
                    type="checkbox"
                    checked={settings.autoQueen}
                    onChange={e => onUpdateSettings({ autoQueen: e.target.checked })}
                  />
                </label>
                <label className="ct-toggle-row">
                  <span>White always at bottom (puzzles)</span>
                  <input
                    type="checkbox"
                    checked={settings.boardOrientation === "white-always-bottom"}
                    onChange={e =>
                      onUpdateSettings({
                        boardOrientation: e.target.checked ? "white-always-bottom" : "follow-side"
                      })
                    }
                  />
                </label>
                <label className="ct-toggle-row">
                  <span>Reduce motion</span>
                  <input
                    type="checkbox"
                    checked={settings.reduceMotion}
                    onChange={e => onUpdateSettings({ reduceMotion: e.target.checked })}
                  />
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Mascot, Audio, Bot Chat, Engine */}
        <div className="ct-card">
          <h2>Coach Mascot</h2>
          <div className="ct-mascot-picker">
            {MASCOTS.map(m => (
              <button
                key={m.id}
                type="button"
                className={`ct-mascot-choice ${settings.mascotId === m.id ? "is-active" : ""}`}
                onClick={() => onUpdateSettings({ mascotId: m.id })}
              >
                <img src={mascotAssetUrl(m.id, "ready")} alt={m.displayName} />
                <strong>{m.displayName}</strong>
                <small className="ct-muted">{m.tagline}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="ct-card">
          <h2>Sound, Chat &amp; Analysis</h2>
          <div className="ct-toggle-list">
            <label className="ct-toggle-row">
              <span>Sound effects</span>
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={e => onUpdateSettings({ soundEnabled: e.target.checked })}
              />
            </label>
            <label className="ct-toggle-row">
              <span>Haptics on mobile</span>
              <input
                type="checkbox"
                checked={settings.hapticsEnabled}
                onChange={e => onUpdateSettings({ hapticsEnabled: e.target.checked })}
              />
            </label>
          </div>

          <div className="ct-control-group">
            <label>Bot chat frequency</label>
            <div className="ct-segmented">
              {(["off", "some", "lots"] as ChatLevel[]).map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  className={settings.chatLevel === lvl ? "is-active" : ""}
                  onClick={() => onUpdateSettings({ chatLevel: lvl })}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div className="ct-control-group">
            <label>Game review depth</label>
            <div className="ct-segmented">
              {(["fast", "normal", "deep"] as ReviewDepthId[]).map(d => (
                <button
                  key={d}
                  type="button"
                  className={settings.reviewDepth === d ? "is-active" : ""}
                  onClick={() => onUpdateSettings({ reviewDepth: d })}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Engine Diagnostics */}
        <div className="ct-card">
          <h2>Stockfish 19 Engine Health</h2>
          <p className="ct-muted">Runs a real Multi-PV search on-device and measures real nodes/sec.</p>
          <button type="button" className="ct-btn ct-btn-secondary" disabled={checkingEngine} onClick={runHealth}>
            <Cpu size={16} /> {checkingEngine ? "Benchmarking…" : "Run Engine Health Check"}
          </button>
          {health && (
            <div className="ct-health-box mono-num">
              <div>Status: {health.ok ? "OK" : "Fallback / Error"}</div>
              <div>Engine: {health.engineName}</div>
              <div>
                Depth: {health.depth} · Best: {health.bestMove ?? "—"} · Eval:{" "}
                {health.evalCp !== null ? `${(health.evalCp / 100).toFixed(2)}` : "—"}
              </div>
              <div>
                Real NPS: {health.nps ? health.nps.toLocaleString() : "—"} · Nodes:{" "}
                {health.nodes ? health.nodes.toLocaleString() : "—"} · {health.durationMs}ms
              </div>
              {health.error && <div className="ct-error-text">{health.error}</div>}
            </div>
          )}
        </div>

        {/* Local Data Backup & Licences */}
        <div className="ct-card">
          <h2>Local Backup &amp; Legal</h2>
          <p className="ct-muted">
            Zero cloud accounts required — all progress lives locally in your browser. Export a JSON file anytime.
          </p>
          <div className="ct-btn-row">
            <button type="button" className="ct-btn ct-btn-secondary" onClick={handleExport}>
              <Download size={16} /> Export JSON
            </button>
            <button type="button" className="ct-btn ct-btn-secondary" onClick={() => fileRef.current?.click()}>
              <Upload size={16} /> Import JSON
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="application/json"
              style={{ display: "none" }}
              onChange={async e => {
                const file = e.target.files?.[0];
                if (!file) return;
                const text = await file.text();
                const res = importAllLocalData(text);
                setImportStatus(res.message);
                if (res.ok) onDataImported();
                e.target.value = "";
              }}
            />
          </div>
          {importStatus && <p className="ct-muted">{importStatus}</p>}

          <div className="ct-btn-row" style={{ marginTop: 12 }}>
            <button type="button" className="ct-btn ct-btn-ghost" onClick={onOpenLicences}>
              Open-Source Licences
            </button>
            {!confirmReset ? (
              <button type="button" className="ct-btn ct-btn-ghost" onClick={() => setConfirmReset(true)}>
                <Trash2 size={15} /> Reset local data
              </button>
            ) : (
              <div className="ct-btn-row">
                <button
                  type="button"
                  className="ct-btn ct-btn-danger"
                  onClick={() => {
                    onResetAllData();
                    setConfirmReset(false);
                  }}
                >
                  Confirm Wipe All Data
                </button>
                <button type="button" className="ct-btn ct-btn-ghost" onClick={() => setConfirmReset(false)}>
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function LicencesPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="ct-page">
      <div className="ct-subpage-bar">
        <button type="button" className="ct-icon-btn" onClick={onBack}>
          <ArrowLeft size={18} /> <span>Settings</span>
        </button>
        <h1>Open-Source Licences</h1>
      </div>

      <div className="ct-card ct-licenses-list">
        <p className="ct-muted">
          Chess Tutor ships Stockfish 19 WASM (GPL-3.0) and open-source datasets, chess pieces, fonts, and audio assets.
        </p>
        <div className="ct-licence-item">
          <strong>Stockfish 19 (WASM)</strong>
          <small className="ct-muted">GPL-3.0 · Stockfish contributors</small>
        </div>
        <div className="ct-licence-item">
          <strong>chess.js</strong>
          <small className="ct-muted">BSD-2-Clause · Jeff Hlywa</small>
        </div>
        <div className="ct-licence-item">
          <strong>Lichess Puzzle Database &amp; Openings (ECO)</strong>
          <small className="ct-muted">CC0 1.0 Public Domain · Lichess.org</small>
        </div>
        <div className="ct-licence-item">
          <strong>Piece Sets</strong>
          <small className="ct-muted">
            cburnett &amp; Merida (GPLv2+), Chessnut (Apache-2.0), Fantasy (MIT)
          </small>
        </div>
        <div className="ct-licence-item">
          <strong>Fonts</strong>
          <small className="ct-muted">
            Schibsted Grotesk, Inter, JetBrains Mono (SIL Open Font License 1.1)
          </small>
        </div>
        <div className="ct-licence-item">
          <strong>Sound Effects</strong>
          <small className="ct-muted">Kenney Audio Packs (CC0 1.0)</small>
        </div>
        <div className="ct-btn-row" style={{ marginTop: 12 }}>
          <a
            href="/assets/licenses/GPL-3.0.txt"
            target="_blank"
            rel="noreferrer"
            className="ct-btn ct-btn-secondary"
          >
            <ExternalLink size={15} /> Read GPL-3.0 Notice
          </a>
        </div>
      </div>
    </div>
  );
}
