import { useEffect, useMemo, useRef, useState } from "react";
import { Chess } from "chess.js";
import {
  ArrowLeft,
  Calendar,
  Check,
  Clock,
  Eye,
  MoreVertical,
  Heart,
  Layers,
  Lightbulb,
  Lock,
  Play,
  RotateCcw,
  Sliders,
  Trophy,
  Zap
} from "lucide-react";
import {
  DIFFICULTY_OFFSETS,
  DifficultyOffset,
  PUZZLES_PER_LEVEL,
  PUZZLES_TO_PASS_LEVEL,
  PUZZLE_GOALS,
  PUZZLE_LEVEL_COUNT,
  PUZZLE_WORLDS,
  Puzzle,
  PuzzleGoalId,
  PuzzlePack,
  PuzzleSession,
  RATING_BANDS,
  RushSelector,
  dailyPuzzleForDate,
  displayThemeName,
  levelTargetRating,
  worldOfLevel,
  patternsForGoal,
  puzzlePrompt,
  puzzlesForLevel,
  selectCustomPuzzles,
  selectThemedPuzzles,
  updatePuzzleElo,
  xpForPuzzleSolve
} from "../domain/puzzles";
import { pieceAssetUrl, whiteAtBottom } from "../domain/theme";
import { playCue, triggerHaptic } from "../lib/audio";
import { parseUci, uciToSan } from "../lib/chessUtils";
import {
  AppSettings,
  PuzzleStoreState,
  TutorGameMistake,
  localDateKey
} from "../lib/storage";
import { BoardArrow, BoardHighlight, BoardHost } from "../components/BoardHost";
import {
  PrimaryButton,
  Tutor,
  BOARD_SCENES,
  BoardPicture,
  HeroCard,
  ListRow,
  PictureTile,
  ScreenTitle,
  SectionHeader,
  TickMark
} from "../components/ct";

export type MistakeRunItem =
  | { kind: "puzzle"; puzzle: Puzzle }
  | { kind: "game-mistake"; mistake: TutorGameMistake; asPuzzle: Puzzle };

export type PuzzleRunConfig =
  | { kind: "level"; level: number; puzzles: Puzzle[]; title: string }
  | { kind: "rush"; variant: "3m" | "5m" | "survival"; title: string }
  | { kind: "daily"; puzzles: Puzzle[]; title: string }
  | { kind: "theme"; puzzles: Puzzle[]; title: string; subtitle?: string }
  | { kind: "custom"; puzzles: Puzzle[]; title: string; timed: boolean }
  | { kind: "mistakes"; items: MistakeRunItem[]; title: string };

export type PuzzlesSubRoute =
  | { view: "home" }
  | { view: "levels" }
  | { view: "modes" }
  | { view: "theme" }
  | { view: "custom" }
  | { view: "player"; config: PuzzleRunConfig };

export function gameMistakeToPuzzle(m: TutorGameMistake): Puzzle {
  // Build a synthetic Puzzle object from a game mistake.
  // PuzzleSession expects moves[0] to be opponent's setup move (or we prepend a dummy skip? No — let's handle game-mistake directly or store initial fen before opponent move).
  // Here m.fen is ALREADY the position right before player's blunder, so we set moves: ["a1a1", m.expected] and handle game-mistake cleanly in PuzzlePlayer.
  return {
    id: m.key,
    fen: m.fen,
    moves: ["0000", m.expected],
    rating: 1300,
    primaryTheme: "mistake",
    themes: ["mistake"],
    popularity: 100,
    alternatives: []
  };
}

export function PuzzlesView({
  route,
  setRoute,
  settings,
  puzzlePack,
  puzzleStore,
  gameMistakes,
  dueReviewCount,
  onRecordPuzzleAttempt,
  onFinishLevel,
  onUpdateRushBest,
  onReviewGameMistake,
  onReportIssue,
  onOpenExplore
}: {
  route: PuzzlesSubRoute;
  setRoute: (r: PuzzlesSubRoute) => void;
  settings: AppSettings;
  puzzlePack: PuzzlePack;
  puzzleStore: PuzzleStoreState;
  gameMistakes: TutorGameMistake[];
  dueReviewCount: number;
  onRecordPuzzleAttempt: (result: {
    puzzleId: string;
    solved: boolean;
    clean: boolean;
    revealed: boolean;
    elapsedMs: number;
    ratingAfter: number;
    xpEarned: number;
    themes: string[];
  }) => void;
  onFinishLevel: (level: number, solvedCount: number) => void;
  onUpdateRushBest: (variant: "3m" | "5m" | "survival", score: number) => void;
  onReviewGameMistake: (mistakeKey: string, clean: boolean) => void;
  onReportIssue: (puzzleId: string, fen: string, note: string) => void;
  onOpenExplore: (fen: string, moves: string[]) => void;
}) {
  const dailyPuzzle = useMemo(() => dailyPuzzleForDate(puzzlePack, new Date()), [puzzlePack]);
  const todaySolvedDaily = useMemo(() => {
    if (!dailyPuzzle) return false;
    const today = localDateKey();
    return puzzleStore.history.some(
      h => h.puzzleId === dailyPuzzle.id && h.solved && localDateKey(new Date(h.finishedAt)) === today
    );
  }, [dailyPuzzle, puzzleStore.history]);

  // Compute current highest unlocked level on the 50-level path
  const currentPathLevel = useMemo(() => {
    for (let lvl = 1; lvl <= PUZZLE_LEVEL_COUNT; lvl++) {
      if (!puzzleStore.levels[lvl]?.passed) return lvl;
    }
    return PUZZLE_LEVEL_COUNT;
  }, [puzzleStore.levels]);

  const startLevel = (level: number) => {
    const rec = puzzleStore.levels[level];
    const playIdx = rec ? rec.plays : 0;
    const seenIds = new Set(puzzleStore.history.slice(-150).map(h => h.puzzleId));
    const puzzles = puzzlesForLevel(level, playIdx, puzzlePack, seenIds);
    if (!puzzles.length) return;
    setRoute({
      view: "player",
      config: { kind: "level", level, puzzles, title: `Level ${level}` }
    });
  };

  const buildMistakesItems = (): MistakeRunItem[] => {
    const items: MistakeRunItem[] = [];
    for (const gm of gameMistakes.slice(0, 8)) {
      items.push({ kind: "game-mistake", mistake: gm, asPuzzle: gameMistakeToPuzzle(gm) });
    }
    for (const pid of puzzleStore.failedPuzzleIds.slice(0, 8)) {
      const p = puzzlePack.get(pid);
      if (p) items.push({ kind: "puzzle", puzzle: p });
    }
    return items;
  };

  if (route.view === "player") {
    return (
      <PuzzlePlayer
        config={route.config}
        settings={settings}
        puzzlePack={puzzlePack}
        puzzleStore={puzzleStore}
        onExit={() => setRoute({ view: "home" })}
        onRecordAttempt={onRecordPuzzleAttempt}
        onFinishLevel={onFinishLevel}
        onUpdateRushBest={onUpdateRushBest}
        onReviewGameMistake={onReviewGameMistake}
        onReportIssue={onReportIssue}
        onOpenExplore={onOpenExplore}
        onNextLevel={lvl => startLevel(Math.min(PUZZLE_LEVEL_COUNT, lvl + 1))}
      />
    );
  }

  if (route.view === "modes") {
    const mistakeItems = buildMistakesItems();
    return (
      <div className="ct-page">
        <div className="ct-subpage-bar">
          <button type="button" className="ct-icon-btn" onClick={() => setRoute({ view: "home" })}>
            <ArrowLeft size={18} /> <span>Puzzles</span>
          </button>
          <h1>Puzzle Modes</h1>
        </div>

        <div className="ct-modes-grid">
          <button
            type="button"
            className="ct-mode-tile"
            disabled={!dailyPuzzle}
            onClick={() =>
              dailyPuzzle &&
              setRoute({
                view: "player",
                config: { kind: "daily", puzzles: [dailyPuzzle], title: "Daily Puzzle" }
              })
            }
          >
            <Calendar size={28} className="ct-accent-text" />
            <div>
              <strong>Daily Puzzle {todaySolvedDaily ? "· Solved" : ""}</strong>
              <small>
                {dailyPuzzle ? `Rated ${dailyPuzzle.rating} · Same puzzle for every player today` : "Loading…"}
              </small>
            </div>
          </button>

          <button
            type="button"
            className="ct-mode-tile"
            disabled={puzzlePack.isEmpty}
            onClick={() =>
              setRoute({ view: "player", config: { kind: "rush", variant: "3m", title: "Rush · 3 min" } })
            }
          >
            <Zap size={28} className="ct-accent-text" />
            <div>
              <strong>Rush · 3 Minutes</strong>
              <small>Solve as many as you can · Best: {puzzleStore.rushBestTimed3}</small>
            </div>
          </button>

          <button
            type="button"
            className="ct-mode-tile"
            disabled={puzzlePack.isEmpty}
            onClick={() =>
              setRoute({ view: "player", config: { kind: "rush", variant: "5m", title: "Rush · 5 min" } })
            }
          >
            <Clock size={28} className="ct-accent-text" />
            <div>
              <strong>Rush · 5 Minutes</strong>
              <small>Endurance sprint · Best: {puzzleStore.rushBestTimed5}</small>
            </div>
          </button>

          <button
            type="button"
            className="ct-mode-tile"
            disabled={puzzlePack.isEmpty}
            onClick={() =>
              setRoute({ view: "player", config: { kind: "rush", variant: "survival", title: "Rush · Survival" } })
            }
          >
            <Heart size={28} className="ct-accent-text" />
            <div>
              <strong>Survival (3 Strikes)</strong>
              <small>No clock, rising difficulty · Best: {puzzleStore.rushBestSurvival}</small>
            </div>
          </button>

          <button type="button" className="ct-mode-tile" onClick={() => setRoute({ view: "theme" })}>
            <Layers size={28} className="ct-accent-text" />
            <div>
              <strong>By Goal &amp; Theme</strong>
              <small>Checkmate, win material, defence, or endgame patterns</small>
            </div>
          </button>

          <button type="button" className="ct-mode-tile" onClick={() => setRoute({ view: "custom" })}>
            <Sliders size={28} className="ct-accent-text" />
            <div>
              <strong>Custom Run</strong>
              <small>Pick rating band, pattern, count, and optional timer</small>
            </div>
          </button>

          <button
            type="button"
            className="ct-mode-tile"
            disabled={mistakeItems.length === 0}
            onClick={() =>
              setRoute({
                view: "player",
                config: { kind: "mistakes", items: mistakeItems, title: "Mistakes Review" }
              })
            }
          >
            <RotateCcw size={28} className="ct-accent-text" />
            <div>
              <strong>Mistakes Review ({mistakeItems.length})</strong>
              <small>
                {mistakeItems.length > 0
                  ? `${gameMistakes.length} game mistakes (${dueReviewCount} due) & ${puzzleStore.failedPuzzleIds.length} failed puzzles`
                  : "Solve puzzles or analyse a game to build your queue"}
              </small>
            </div>
          </button>
        </div>
      </div>
    );
  }

  if (route.view === "theme") {
    return (
      <ByThemePage
        puzzlePack={puzzlePack}
        playerRating={puzzleStore.puzzleRating}
        onBack={() => setRoute({ view: "modes" })}
        onStart={(puzzles, title, subtitle) =>
          setRoute({ view: "player", config: { kind: "theme", puzzles, title, subtitle } })
        }
      />
    );
  }

  if (route.view === "custom") {
    return (
      <CustomRunPage
        puzzlePack={puzzlePack}
        onBack={() => setRoute({ view: "modes" })}
        onStart={(puzzles, title, timed) =>
          setRoute({ view: "player", config: { kind: "custom", puzzles, title, timed } })
        }
      />
    );
  }

  const mistakeItemsHome = buildMistakesItems();
  const currentWorld = worldOfLevel(currentPathLevel);
  const currentRec = puzzleStore.levels[currentPathLevel];
  const passedCount = Object.values(puzzleStore.levels).filter(l => l.passed).length;

  if (route.view === "levels") {
    return (
      <div className="ct-page">
        <div className="ct-subpage-bar">
          <button type="button" className="ct-icon-btn" onClick={() => setRoute({ view: "home" })}>
            <ArrowLeft size={18} /> <span>Puzzles</span>
          </button>
          <h1>Levels</h1>
        </div>
        <p className="ct-muted">{passedCount} of {PUZZLE_LEVEL_COUNT} passed</p>
      <section className="ct-section">
        <div className="ct-section-head">
          <h2>50-Level Tactical Path</h2>
          <span className="ct-muted mono-num">
            {Object.values(puzzleStore.levels).filter(l => l.passed).length}/{PUZZLE_LEVEL_COUNT} passed
          </span>
        </div>

        <div className="ct-worlds-stack">
          {PUZZLE_WORLDS.map(world => {
            const levels = Array.from(
              { length: world.maxLevel - world.minLevel + 1 },
              (_, i) => world.minLevel + i
            );
            const passedInWorld = levels.filter(l => puzzleStore.levels[l]?.passed).length;

            return (
              <div key={world.id} className={`ct-world-card accent-${world.accent}`}>
                <div className="ct-world-head">
                  <div>
                    <div className="ct-kicker">
                      World {world.number} · {world.badge}
                    </div>
                    <h3>{world.title}</h3>
                    <p className="ct-muted">{world.tagline}</p>
                  </div>
                  <span className="ct-pill-tag mono-num">
                    {passedInWorld}/{levels.length}
                  </span>
                </div>

                <div className="ct-level-path">
                  {levels.map((lvl, idx) => {
                    const rec = puzzleStore.levels[lvl];
                    const passed = Boolean(rec?.passed);
                    const isCurrent = lvl === currentPathLevel;
                    const unlocked = passed || isCurrent || lvl <= currentPathLevel;
                    const stagger = idx % 3 === 1 ? "shift-mid" : idx % 3 === 2 ? "shift-right" : "";
                    return (
                      <button
                        key={lvl}
                        type="button"
                        disabled={!unlocked || puzzlePack.isEmpty}
                        className={`ct-level-node ${stagger} ${passed ? "is-passed" : isCurrent ? "is-current" : "is-locked"}`}
                        onClick={() => startLevel(lvl)}
                        title={`Level ${lvl} (~${levelTargetRating(lvl)})`}
                      >
                        <div className="ct-level-circle mono-num">
                          {passed ? <Check size={16} /> : unlocked ? lvl : <Lock size={14} />}
                        </div>
                        <small className="mono-num">
                          {rec?.bestScore ? `${rec.bestScore}/${PUZZLES_PER_LEVEL}` : `~${levelTargetRating(lvl)}`}
                        </small>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

  return (
    <div className="ct2-page">
      <ScreenTitle title="Puzzles">
        <span className="ct2-big-figure" aria-label={`Puzzle rating ${puzzleStore.puzzleRating}`}>
          {puzzleStore.puzzleRating}
        </span>
      </ScreenTitle>
      <div className="ct2-gutter" style={{ display: "flex", flexDirection: "column", gap: 12, paddingTop: 16 }}>
        <div className="ct2-enter">
          <HeroCard
            kicker={`${currentWorld.title}, world ${currentWorld.number}`}
            title={`Level ${currentPathLevel}`}
            subtitle={
              currentRec?.bestScore
                ? `Best ${currentRec.bestScore} of ${PUZZLES_PER_LEVEL}`
                : `Solve ${PUZZLES_TO_PASS_LEVEL} of ${PUZZLES_PER_LEVEL} to pass`
            }
            onClick={() => startLevel(currentPathLevel)}
            ariaLabel={`Play level ${currentPathLevel}`}
            picture={
              <BoardPicture fen={BOARD_SCENES.OPENING} boardThemeId={settings.boardThemeId} pieceSet={settings.pieceSetId} aspect={3} />
            }
          />
        </div>
        <div className="ct2-tile-row ct2-enter" style={{ animationDelay: "60ms" }}>
          <PictureTile
            title="Daily puzzle"
            subtitle={todaySolvedDaily ? "Solved today" : "Waiting for you"}
            onClick={() =>
              dailyPuzzle &&
              setRoute({ view: "player", config: { kind: "daily", puzzles: [dailyPuzzle], title: "Daily puzzle" } })
            }
            ariaLabel="Open the daily puzzle"
            trailing={todaySolvedDaily ? <TickMark /> : undefined}
            picture={
              <BoardPicture
                fen={dailyPuzzle?.fen}
                boardThemeId={settings.boardThemeId}
                pieceSet={settings.pieceSetId}
                whiteAtBottom={dailyPuzzle ? dailyPuzzle.fen.split(" ")[1] === "b" : true}
                aspect={1.1}
              />
            }
          />
          <PictureTile
            title="Mistakes to fix"
            subtitle={dueReviewCount > 0 ? `${dueReviewCount} due today` : "From your games"}
            onClick={() =>
              mistakeItemsHome.length
                ? setRoute({ view: "player", config: { kind: "mistakes", items: mistakeItemsHome, title: "Mistakes review" } })
                : setRoute({ view: "modes" })
            }
            ariaLabel="Review the mistakes from your games"
            picture={
              <BoardPicture fen={BOARD_SCENES.ATTACK} boardThemeId={settings.boardThemeId} pieceSet={settings.pieceSetId} aspect={1.1} />
            }
          />
        </div>
        <SectionHeader title="More" />
        <div>
          <ListRow title="Puzzle modes" subtitle="Rush, by theme, custom" icon="tune" onClick={() => setRoute({ view: "modes" })} />
          <ListRow
            title="All levels"
            subtitle={`${passedCount} of ${PUZZLE_LEVEL_COUNT} passed`}
            icon="map"
            onClick={() => setRoute({ view: "levels" })}
          />
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   By Theme & Custom Setup Subpages
   ========================================================================== */

function ByThemePage({
  puzzlePack,
  playerRating,
  onBack,
  onStart
}: {
  puzzlePack: PuzzlePack;
  playerRating: number;
  onBack: () => void;
  onStart: (puzzles: Puzzle[], title: string, subtitle: string) => void;
}) {
  const [goal, setGoal] = useState<PuzzleGoalId>("win-material");
  const [pattern, setPattern] = useState<string | null>(null);
  const [diff, setDiff] = useState<DifficultyOffset>("matched");

  const patterns = useMemo(() => patternsForGoal(puzzlePack, goal), [puzzlePack, goal]);

  return (
    <div className="ct-page">
      <div className="ct-subpage-bar">
        <button type="button" className="ct-icon-btn" onClick={onBack}>
          <ArrowLeft size={18} /> <span>Modes</span>
        </button>
        <h1>Puzzles by Theme</h1>
      </div>

      <div className="ct-setup-card">
        <div className="ct-control-group">
          <label>1. Choose a Goal</label>
          <div className="ct-goal-grid">
            {PUZZLE_GOALS.map(g => (
              <button
                key={g.id}
                type="button"
                className={`ct-choice-card ${goal === g.id ? "is-active" : ""}`}
                onClick={() => {
                  setGoal(g.id);
                  setPattern(null);
                }}
              >
                <div>
                  <strong>{g.title}</strong>
                  <small>{g.subtitle}</small>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="ct-control-group">
          <label>2. Optional Pattern Filter</label>
          <div className="ct-chip-wrap">
            <button
              type="button"
              className={`ct-chip-btn ${pattern === null ? "is-active" : ""}`}
              onClick={() => setPattern(null)}
            >
              Mix all patterns
            </button>
            {patterns.slice(0, 16).map(p => (
              <button
                key={p.theme}
                type="button"
                className={`ct-chip-btn ${pattern === p.theme ? "is-active" : ""}`}
                onClick={() => setPattern(p.theme)}
              >
                {p.label} ({p.count})
              </button>
            ))}
          </div>
        </div>

        <div className="ct-control-group">
          <label>3. Difficulty vs your {playerRating} rating</label>
          <div className="ct-segmented">
            {(Object.keys(DIFFICULTY_OFFSETS) as DifficultyOffset[]).map(k => (
              <button
                key={k}
                type="button"
                className={diff === k ? "is-active" : ""}
                onClick={() => setDiff(k)}
              >
                {DIFFICULTY_OFFSETS[k].label}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="ct-btn ct-btn-primary ct-btn-lg"
          disabled={puzzlePack.isEmpty}
          onClick={() => {
            const target = Math.max(400, Math.min(2600, playerRating + DIFFICULTY_OFFSETS[diff].offset));
            const list = selectThemedPuzzles(puzzlePack, goal, pattern, target, 10);
            if (list.length) {
              const title = pattern ? displayThemeName(pattern) : PUZZLE_GOALS.find(g => g.id === goal)!.title;
              onStart(list, title, `${DIFFICULTY_OFFSETS[diff].label} · ~${target}`);
            }
          }}
        >
          <Play size={18} /> Start 10-Puzzle Set
        </button>
      </div>
    </div>
  );
}

function CustomRunPage({
  puzzlePack,
  onBack,
  onStart
}: {
  puzzlePack: PuzzlePack;
  onBack: () => void;
  onStart: (puzzles: Puzzle[], title: string, timed: boolean) => void;
}) {
  const [bandIdx, setBandIdx] = useState(1);
  const [pattern, setPattern] = useState<string | null>(null);
  const [count, setCount] = useState(10);
  const [timed, setTimed] = useState(false);

  const popularPatterns = useMemo(
    () => [
      "fork",
      "pin",
      "skewer",
      "discoveredAttack",
      "backRankMate",
      "mateIn2",
      "deflection",
      "hangingPiece",
      "pawnEndgame",
      "rookEndgame"
    ],
    []
  );

  return (
    <div className="ct-page">
      <div className="ct-subpage-bar">
        <button type="button" className="ct-icon-btn" onClick={onBack}>
          <ArrowLeft size={18} /> <span>Modes</span>
        </button>
        <h1>Custom Puzzle Run</h1>
      </div>

      <div className="ct-setup-card">
        <div className="ct-control-group">
          <label>Rating Band</label>
          <div className="ct-chip-wrap">
            {RATING_BANDS.map((b, i) => (
              <button
                key={b.id}
                type="button"
                className={`ct-chip-btn ${bandIdx === i ? "is-active" : ""}`}
                onClick={() => setBandIdx(i)}
              >
                {b.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ct-control-group">
          <label>Theme (optional)</label>
          <div className="ct-chip-wrap">
            <button
              type="button"
              className={`ct-chip-btn ${pattern === null ? "is-active" : ""}`}
              onClick={() => setPattern(null)}
            >
              Any theme
            </button>
            {popularPatterns.map(p => (
              <button
                key={p}
                type="button"
                className={`ct-chip-btn ${pattern === p ? "is-active" : ""}`}
                onClick={() => setPattern(p)}
              >
                {displayThemeName(p)}
              </button>
            ))}
          </div>
        </div>

        <div className="ct-control-group">
          <label>Number of puzzles</label>
          <div className="ct-segmented">
            {[5, 10, 20].map(n => (
              <button key={n} type="button" className={count === n ? "is-active" : ""} onClick={() => setCount(n)}>
                {n} puzzles
              </button>
            ))}
          </div>
        </div>

        <label className="ct-toggle-row">
          <span>Show speed-bonus timer</span>
          <input type="checkbox" checked={timed} onChange={e => setTimed(e.target.checked)} />
        </label>

        <button
          type="button"
          className="ct-btn ct-btn-primary ct-btn-lg"
          onClick={() => {
            const band = RATING_BANDS[bandIdx];
            const list = selectCustomPuzzles(puzzlePack, band, pattern, count);
            if (list.length) {
              onStart(list, `Custom (${band.label})`, timed);
            }
          }}
        >
          <Play size={18} /> Launch Custom Set
        </button>
      </div>
    </div>
  );
}

/* ==========================================================================
   Unified Puzzle Player (Levels, Rush, Daily, Themed, Custom, Mistakes)
   ========================================================================== */

function PuzzlePlayer({
  config,
  settings,
  puzzlePack,
  puzzleStore,
  onExit,
  onRecordAttempt,
  onFinishLevel,
  onUpdateRushBest,
  onReviewGameMistake,
  onReportIssue,
  onOpenExplore,
  onNextLevel
}: {
  config: PuzzleRunConfig;
  settings: AppSettings;
  puzzlePack: PuzzlePack;
  puzzleStore: PuzzleStoreState;
  onExit: () => void;
  onRecordAttempt: (result: {
    puzzleId: string;
    solved: boolean;
    clean: boolean;
    revealed: boolean;
    elapsedMs: number;
    ratingAfter: number;
    xpEarned: number;
    themes: string[];
  }) => void;
  onFinishLevel: (level: number, solvedCount: number) => void;
  onUpdateRushBest: (variant: "3m" | "5m" | "survival", score: number) => void;
  onReviewGameMistake: (mistakeKey: string, clean: boolean) => void;
  onReportIssue: (puzzleId: string, fen: string, note: string) => void;
  onOpenExplore: (fen: string, moves: string[]) => void;
  onNextLevel: (level: number) => void;
}) {
  const rushSelectorRef = useRef<RushSelector | null>(
    config.kind === "rush" ? new RushSelector(puzzlePack, puzzleStore.puzzleRating) : null
  );

  const initialPuzzle: Puzzle | null = useMemo(() => {
    if (config.kind === "rush") {
      return rushSelectorRef.current?.next(0) ?? null;
    }
    if (config.kind === "mistakes") {
      return config.items[0]?.kind === "puzzle"
        ? config.items[0].puzzle
        : config.items[0]?.asPuzzle ?? null;
    }
    return config.puzzles[0] ?? null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  const [index, setIndex] = useState(0);
  const [solvedCount, setSolvedCount] = useState(0);
  const [strikes, setStrikes] = useState(0);
  const [runEnded, setRunEnded] = useState(false);
  const [xpRunTotal, setXpRunTotal] = useState(0);

  // For game mistakes, board starts directly at m.fen without moves[0] setup move
  const currentMistakeItem = config.kind === "mistakes" ? config.items[index] : undefined;

  const createSessionFor = (p: Puzzle, isGameMistake: boolean): PuzzleSession => {
    if (isGameMistake) {
      // Create a custom wrapper matching PuzzleSession by giving an immediate fen-turn puzzle:
      // Actually PuzzleSession plays moves[0] on construction. If moves[0] === "0000" it skips!
      // Let's double check: PuzzleSession calls parseUci("0000") which returns null cleanly and sets solverColor = chess.turn()!
      return new PuzzleSession(p);
    }
    return new PuzzleSession(p);
  };

  const [session, setSession] = useState<PuzzleSession | null>(() =>
    initialPuzzle ? createSessionFor(initialPuzzle, currentMistakeItem?.kind === "game-mistake") : null
  );
  const [, forceTick] = useState(0);
  const [hintTarget, setHintTarget] = useState<{ square?: string; uci?: string } | null>(null);
  const [mistakeSquare, setMistakeSquare] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string>("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reportNote, setReportNote] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  /** How each puzzle of the run went, for the bars above the board. */
  const [marks, setMarks] = useState<("clean" | "solved" | "missed")[]>([]);

  // Timers
  const startTimeRef = useRef<number>(Date.now());
  const [elapsedSec, setElapsedSec] = useState(0);
  const [rushRemainingSec, setRushRemainingSec] = useState<number | null>(() => {
    if (config.kind !== "rush") return null;
    return config.variant === "3m" ? 180 : config.variant === "5m" ? 300 : null;
  });

  const rushFinalizedRef = useRef(false);

  const finishRush = (finalSolved: number) => {
    if (config.kind !== "rush" || rushFinalizedRef.current) return;
    rushFinalizedRef.current = true;
    setRunEnded(true);
    onUpdateRushBest(config.variant, finalSolved);
  };

  useEffect(() => {
    if (runEnded) return;
    const t = window.setInterval(() => {
      setElapsedSec(Math.floor((Date.now() - startTimeRef.current) / 1000));
      if (config.kind === "rush" && config.variant !== "survival") {
        setRushRemainingSec(prev => {
          if (prev === null) return null;
          if (prev <= 1) {
            finishRush(solvedCount);
            return 0;
          }
          return prev - 1;
        });
      }
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runEnded, config.kind, solvedCount]);

  const loadPuzzle = (p: Puzzle, isGameMistake: boolean) => {
    setSession(createSessionFor(p, isGameMistake));
    setHintTarget(null);
    setMistakeSquare(null);
    setFeedback("");
    setReportOpen(false);
    setReportNote("");
    setReportSent(false);
    setMenuOpen(false);
    startTimeRef.current = Date.now();
    setElapsedSec(0);
    forceTick(n => n + 1);
  };

  const advanceNext = () => {
    if (config.kind === "rush") {
      if (strikes >= 3 || rushRemainingSec === 0) {
        finishRush(solvedCount);
        return;
      }
      const nextP = rushSelectorRef.current?.next(solvedCount);
      if (!nextP) {
        finishRush(solvedCount);
        return;
      }
      setIndex(i => i + 1);
      loadPuzzle(nextP, false);
      return;
    }

    const total = config.kind === "mistakes" ? config.items.length : config.puzzles.length;
    if (index + 1 >= total) {
      if (config.kind === "level") {
        onFinishLevel(config.level, solvedCount);
      }
      setRunEnded(true);
      return;
    }

    const nextIdx = index + 1;
    setIndex(nextIdx);
    if (config.kind === "mistakes") {
      const item = config.items[nextIdx];
      loadPuzzle(item.kind === "puzzle" ? item.puzzle : item.asPuzzle, item.kind === "game-mistake");
    } else {
      loadPuzzle(config.puzzles[nextIdx], false);
    }
  };

  if (!session) {
    return (
      <div className="ct-page">
        <button type="button" className="ct-icon-btn" onClick={onExit}>
          <ArrowLeft size={18} /> <span>Back</span>
        </button>
        <div className="ct-card">
          <p className="ct-muted">No puzzles available for this selection.</p>
        </div>
      </div>
    );
  }

  const recordFinish = (solved: boolean, revealed: boolean, clean: boolean) => {
    const elapsedMs = Date.now() - startTimeRef.current;
    setMarks(m => {
      const next = [...m];
      next[index] = solved ? (clean ? "clean" : "solved") : "missed";
      return next;
    });
    if (currentMistakeItem?.kind === "game-mistake") {
      onReviewGameMistake(currentMistakeItem.mistake.key, clean);
      if (solved) {
        setSolvedCount(c => c + 1);
        setXpRunTotal(x => x + (clean ? 10 : 4));
      }
      return;
    }

    const xp =
      config.kind === "rush"
        ? solved
          ? 5
          : 0
        : xpForPuzzleSolve({
            solved,
            clean,
            revealed,
            elapsedMs,
            cleanStreak: puzzleStore.cleanStreak + (clean ? 1 : 0)
          });

    const newRating =
      config.kind === "rush"
        ? puzzleStore.puzzleRating
        : updatePuzzleElo(puzzleStore.puzzleRating, session.puzzle.rating, clean);

    onRecordAttempt({
      puzzleId: session.puzzle.id,
      solved,
      clean,
      revealed,
      elapsedMs,
      ratingAfter: newRating,
      xpEarned: xp,
      themes: session.puzzle.themes
    });
    if (solved) {
      setSolvedCount(c => c + 1);
      setXpRunTotal(x => x + xp);
    }
  };

  const handleMove = (uci: string) => {
    if (session.status !== "solving" || runEnded) return;
    const outcome = session.submit(uci);
    if (outcome.kind === "illegal" || outcome.kind === "not-solving") return;

    if (outcome.kind === "wrong") {
      playCue("wrong", settings.soundEnabled);
      triggerHaptic("wrong", settings.hapticsEnabled);
      setMistakeSquare(uci.slice(2, 4));
      setTimeout(() => setMistakeSquare(null), 500);

      if (config.kind === "rush") {
        const nextStrikes = strikes + 1;
        setStrikes(nextStrikes);
        recordFinish(false, false, false);
        if (nextStrikes >= 3) {
          finishRush(solvedCount);
        } else {
          setFeedback("Strike! Next puzzle…");
          setTimeout(() => advanceNext(), 600);
        }
        return;
      }

      setFeedback("Not the strongest move. Try again or take a hint.");
      forceTick(n => n + 1);
      return;
    }

    // Correct move!
    setHintTarget(null);
    playCue(outcome.solved ? "correct" : "move", settings.soundEnabled);
    triggerHaptic(outcome.solved ? "success" : "move", settings.hapticsEnabled);

    if (outcome.solved) {
      const clean = session.clean;
      setFeedback(
        outcome.alternative
          ? "Solved: a great alternative!"
          : clean
          ? "Solved cleanly!"
          : "Solved!"
      );
      recordFinish(true, false, clean);
      if (config.kind === "rush") {
        setTimeout(() => advanceNext(), 450);
      }
    } else {
      setFeedback("Good move — keep going!");
    }
    forceTick(n => n + 1);
  };

  const handleHint = () => {
    const h = session.requestHint();
    if (!h) return;
    setHintTarget(h.kind === "piece" ? { square: h.square } : { uci: h.uci });
    playCue("tap", settings.soundEnabled);
    forceTick(n => n + 1);
  };

  const handleReveal = () => {
    session.revealSolution();
    setHintTarget(null);
    playCue("tap", settings.soundEnabled);
    recordFinish(false, true, false);
    if (config.kind === "rush") {
      const nextStrikes = strikes + 1;
      setStrikes(nextStrikes);
      if (nextStrikes >= 3) finishRush(solvedCount);
      else setTimeout(() => advanceNext(), 650);
    } else {
      setFeedback("Solution shown. Review the line or analyse with Stockfish.");
    }
    forceTick(n => n + 1);
  };

  if (runEnded) {
    const total =
      config.kind === "rush"
        ? index + 1
        : config.kind === "mistakes"
        ? config.items.length
        : config.puzzles.length;
    const levelPassed = config.kind === "level" && solvedCount >= PUZZLES_TO_PASS_LEVEL;

    return (
      <div className="ct-focus-shell">
        <header className="ct-focus-topbar">
          <button type="button" className="ct-icon-btn" onClick={onExit}>
            <ArrowLeft size={18} /> <span>Puzzles</span>
          </button>
          <div className="ct-focus-title">
            <strong>{config.title} Complete</strong>
          </div>
          <div />
        </header>

        <div className="ct-page">
          <div className="ct-setup-card ct-summary-card">
            <Trophy size={40} className="ct-accent-text" />
            <h2>
              {config.kind === "rush"
                ? `Rush Score: ${solvedCount}`
                : config.kind === "level"
                ? levelPassed
                  ? `Level ${config.level} Passed!`
                  : `Level ${config.level} Finished`
                : `Set Complete`}
            </h2>
            <p className="ct-muted">
              {config.kind === "rush"
                ? `Solved ${solvedCount} puzzles (${strikes}/3 strikes).`
                : `Solved ${solvedCount} of ${total} puzzles · +${xpRunTotal} XP earned.`}
            </p>
            {config.kind === "level" && !levelPassed && (
              <p className="ct-muted">Solve {PUZZLES_TO_PASS_LEVEL} of {PUZZLES_PER_LEVEL} to unlock the next level.</p>
            )}
            <div className="ct-btn-row">
              {config.kind === "level" && levelPassed && config.level < PUZZLE_LEVEL_COUNT && (
                <button
                  type="button"
                  className="ct-btn ct-btn-primary"
                  onClick={() => onNextLevel(config.level)}
                >
                  <Play size={16} /> Next: Level {config.level + 1}
                </button>
              )}
              <button type="button" className="ct-btn ct-btn-secondary" onClick={onExit}>
                Back to Puzzles
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const totalInSet =
    config.kind === "rush"
      ? null
      : config.kind === "mistakes"
      ? config.items.length
      : config.puzzles.length;

  const isGameMistake = currentMistakeItem?.kind === "game-mistake";
  const orientation: "w" | "b" = whiteAtBottom(settings.boardOrientation, session.solverColor) ? "w" : "b";
  const sideName = session.solverColor === "w" ? "White" : "Black";
  const promptMessage =
    feedback ||
    (isGameMistake
      ? currentMistakeItem.mistake.goal
      : puzzlePrompt(session.puzzle));

  const arrows: BoardArrow[] = [];
  const highlights: BoardHighlight[] = [];
  if (hintTarget?.square) highlights.push({ square: hintTarget.square, kind: "idea" });
  if (hintTarget?.uci && hintTarget.uci.length >= 4) {
    arrows.push({ from: hintTarget.uci.slice(0, 2), to: hintTarget.uci.slice(2, 4), kind: "hint" });
  }

  const isSolvedOrRevealed = session.status !== "solving";
  const formatSec = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
  const after = isSolvedOrRevealed;
  const coachText =
    session.status === "solved"
      ? feedback.startsWith("Solved: a great alternative")
        ? "Solved: a great alternative! That move wins too."
        : "Correct! Well found."
      : session.status === "revealed"
      ? "Not this time. Have a look at the solution."
      : promptMessage;
  const headline =
    session.status === "solved"
      ? feedback.startsWith("Solved: a great alternative")
        ? "Solved another way"
        : "Solved"
      : session.status === "revealed"
      ? "Solution"
      : `${sideName} to move`;
  const isLast = totalInSet !== null && index + 1 >= totalInSet;
  const analyse = () => {
    setMenuOpen(false);
    const startPos = isGameMistake
      ? currentMistakeItem.mistake.fen
      : (() => {
          const c = new Chess(session.puzzle.fen);
          const p = parseUci(session.openingMove);
          if (p) c.move({ from: p.from, to: p.to, promotion: p.promotion ?? "q" });
          return c.fen();
        })();
    const line = isGameMistake ? [currentMistakeItem.mistake.expected] : session.puzzle.moves.slice(1);
    onOpenExplore(startPos, line);
  };

  return (
    <div className="ct2-board-screen">
      <header className="ct2-board-topbar">
        <button type="button" className="ct2-icon-btn" aria-label="Back" onClick={onExit}>
          <ArrowLeft size={22} />
        </button>
        <h1>{config.title}</h1>
        <div className="ct2-menu-anchor">
          <button type="button" className="ct2-icon-btn" aria-label="More options" onClick={() => setMenuOpen(o => !o)}>
            <MoreVertical size={20} />
          </button>
          {menuOpen ? (
            <div className="ct2-menu" role="menu">
              {after ? (
                <button type="button" role="menuitem" onClick={analyse}>
                  Analyse
                </button>
              ) : null}
              {!isGameMistake ? (
                <button
                  type="button"
                  role="menuitem"
                  disabled={!after || reportSent}
                  onClick={() => {
                    setMenuOpen(false);
                    setReportOpen(true);
                  }}
                >
                  {reportSent ? "Reported, thank you" : "Another move works here"}
                </button>
              ) : null}
            </div>
          ) : null}
        </div>
      </header>

      <div className="ct2-board-zone ct2-puzzle-zone">
        <Tutor mascotId={settings.mascotId} mood={session.status === "solved" ? "proud" : session.status === "revealed" ? "kind" : hintTarget ? "thinking" : "ready"}>
          <span>{coachText}</span>
          {after && isGameMistake ? (
            <span className="ct2-caption">
              In your game vs {currentMistakeItem.mistake.opponent} you played {currentMistakeItem.mistake.san}. Best was{" "}
              {uciToSan(currentMistakeItem.mistake.fen, currentMistakeItem.mistake.expected)}.
            </span>
          ) : null}
          {reportSent ? <span className="ct2-caption">Thanks! Saved in this browser to improve the puzzles.</span> : null}
        </Tutor>
        <div className="ct2-puzzle-status">
          {session.status === "solved" ? (
            <span className="ct2-status-mark is-solved">
              <Check size={18} strokeWidth={3} />
            </span>
          ) : session.status === "revealed" ? (
            <span className="ct2-status-mark">
              <Eye size={16} />
            </span>
          ) : (
            <img className="ct2-status-king" src={pieceAssetUrl(settings.pieceSetId, session.solverColor, "k")} alt="" />
          )}
          <strong>{headline}</strong>
          {config.kind === "rush" ? (
            <>
              <span className="ct2-strikes">Strikes {strikes}/3</span>
              <span className="ct2-caption">{solvedCount} solved</span>
            </>
          ) : totalInSet ? (
            <span className="ct2-caption">
              {index + 1} of {totalInSet}
            </span>
          ) : null}
          <span className="ct2-status-clock">
            {rushRemainingSec !== null ? formatSec(rushRemainingSec) : formatSec(elapsedSec)}
          </span>
        </div>
        {totalInSet ? (
          <div className="ct2-run-bars" aria-label={`Puzzle ${index + 1} of ${totalInSet}, ${solvedCount} solved`}>
            {Array.from({ length: totalInSet }, (_, i) => (
              <span key={i} className={marks[i] ? `is-${marks[i]}` : i === index ? "is-now" : ""} />
            ))}
          </div>
        ) : null}
      </div>

      <div className="ct2-board-area">
        <BoardHost
          fen={session.fen}
          orientation={orientation}
          interactive={session.status === "solving"}
          allowedSide={session.solverColor}
          boardColorsId={settings.boardThemeId}
          pieceSetId={settings.pieceSetId}
          showCoordinates={settings.showCoordinates}
          showLegalDots={settings.showLegalDots}
          autoQueen={settings.autoQueen}
          reduceMotion={settings.reduceMotion}
          lastMove={session.lastMove === "0000" ? null : session.lastMove}
          arrows={arrows}
          highlights={highlights}
          mistakeFlashSquare={mistakeSquare}
          onMove={handleMove}
        />
        <div className="ct2-under-slot">
        {after && !isGameMistake ? (
          <div className="ct2-under-chips">
            <span className="ct2-chip">Rated {session.puzzle.rating}</span>
            {session.puzzle.themes.slice(0, 3).map(t => (
              <span key={t} className="ct2-chip">
                {displayThemeName(t)}
              </span>
            ))}
          </div>
        ) : null}
        </div>
      </div>

      <div className="ct2-board-controls">
        {after ? (
          <PrimaryButton onClick={advanceNext}>{isLast ? "See your result" : "Next puzzle"}</PrimaryButton>
        ) : (
          <>
            <button type="button" className="ct2-control" onClick={handleHint}>
              <Lightbulb size={20} />
              <span>Hint</span>
            </button>
            <button type="button" className="ct2-control" onClick={handleReveal}>
              <Eye size={20} />
              <span>Solution</span>
            </button>
          </>
        )}
      </div>

      {reportOpen ? (
        <div className="ct2-sheet-scrim" onClick={() => setReportOpen(false)}>
          <div className="ct2-sheet" role="dialog" aria-label="Another move works here" onClick={e => e.stopPropagation()}>
            <div className="ct2-sheet-handle" aria-hidden="true" />
            <h2>Another move works here</h2>
            <p className="ct2-caption">Say which move, if you like. The report stays in this browser.</p>
            <input
              className="ct2-input"
              style={{ marginTop: 12 }}
              placeholder="e.g. Qe7 also wins"
              value={reportNote}
              onChange={e => setReportNote(e.target.value)}
            />
            <div className="ct2-pair-buttons" style={{ marginTop: 16 }}>
              <button type="button" className="ct2-secondary" onClick={() => setReportOpen(false)}>
                Cancel
              </button>
              <PrimaryButton
                onClick={() => {
                  onReportIssue(session.puzzle.id, session.fen, reportNote.trim() || "Alternative move claimed");
                  setReportOpen(false);
                  setReportSent(true);
                }}
              >
                Report
              </PrimaryButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
