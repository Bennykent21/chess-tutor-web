import { useMemo, useState } from "react";
import { Chess } from "chess.js";
import {
  ArrowLeft,
  ChevronRight,
  Compass,
  Cpu,
  Eye,
  Flame,
  Pencil,
  Play,
  Plus,
  Search,
  Sparkles,
  Swords,
  Trash2
} from "lucide-react";
import {
  BOT_ROSTER,
  BOT_STYLES,
  BotProfile,
  BotStyleId,
  ResignPolicy,
  ThinkSpeed,
  closestRosterBot
} from "../domain/bots";
import {
  BattleMode,
  OpeningLine,
  OpeningTree,
  createBattlePlan,
  groupFamilyLines
} from "../domain/openings";
import { LessonCourse, continueLessonFromLibrary } from "../domain/lessons";
import { Puzzle, PuzzlePack, dailyPuzzleForDate } from "../domain/puzzles";
import { botAssetUrl, mascotAssetUrl } from "../domain/theme";
import {
  ActiveGameSnapshot,
  AppSettings,
  OnboardingProfile,
  PuzzleStoreState,
  StartingLevelId,
  computeDayStreak,
  generateUuid,
  localDateKey
} from "../lib/storage";
import { PlayBoardLaunch, TIME_CONTROLS, TimeControlOption } from "./PlayBoardView";
import { CoachBubble } from "../components/CoachBubble";
import { BoardHost } from "../components/BoardHost";

export type HomeSubRoute =
  | { view: "hub" }
  | { view: "bots" }
  | { view: "bot-setup"; bot: BotProfile }
  | { view: "builder"; editing?: BotProfile }
  | { view: "battle"; presetOpeningName?: string }
  | { view: "position" }
  | { view: "watch" }
  | { view: "explore" };

export function HomeView({
  route,
  setRoute,
  settings,
  onboarding,
  puzzleStore,
  courses,
  lessonProgress,
  customBots,
  activeGame,
  openingTree,
  puzzlePack,
  dueMistakesCount,
  effectiveRating,
  onCompleteWelcome,
  onSaveCustomBot,
  onDeleteCustomBot,
  onLaunchPlay,
  onOpenLesson,
  onOpenDailyPuzzle,
  onOpenMistakesReview,
  onOpenHealthCheck
}: {
  route: HomeSubRoute;
  setRoute: (r: HomeSubRoute) => void;
  settings: AppSettings;
  onboarding: OnboardingProfile;
  puzzleStore: PuzzleStoreState;
  courses: LessonCourse[];
  lessonProgress: Record<string, { lessonId: string; stepIndex: number; completed: boolean }>;
  customBots: BotProfile[];
  activeGame: ActiveGameSnapshot | null;
  openingTree: OpeningTree;
  puzzlePack: PuzzlePack;
  dueMistakesCount: number;
  effectiveRating: number;
  onCompleteWelcome: (name: string, level: StartingLevelId) => void;
  onSaveCustomBot: (bot: BotProfile) => void;
  onDeleteCustomBot: (botId: string) => void;
  onLaunchPlay: (launch: PlayBoardLaunch) => void;
  onOpenLesson: (course: LessonCourse, lessonId: string) => void;
  onOpenDailyPuzzle: (puzzle: Puzzle) => void;
  onOpenMistakesReview: () => void;
  onOpenHealthCheck: () => void;
}) {
  const [welcomeName, setWelcomeName] = useState(settings.playerName);
  const streak = computeDayStreak(puzzleStore.activeDays);
  const dailyPuzzle = useMemo(() => dailyPuzzleForDate(puzzlePack, new Date()), [puzzlePack]);
  const todaySolvedDaily = useMemo(() => {
    if (!dailyPuzzle) return false;
    const today = localDateKey();
    return puzzleStore.history.some(
      h => h.puzzleId === dailyPuzzle.id && h.solved && localDateKey(new Date(h.finishedAt)) === today
    );
  }, [dailyPuzzle, puzzleStore.history]);

  const nextLesson = useMemo(() => continueLessonFromLibrary(courses, lessonProgress), [courses, lessonProgress]);
  const quickMatchBot = useMemo(() => closestRosterBot(effectiveRating).profile, [effectiveRating]);

  if (!onboarding.completed) {
    return (
      <div className="ct-welcome-page">
        <div className="ct-welcome-card">
          <img src={mascotAssetUrl(settings.mascotId, "ready")} alt="Coach mascot" className="ct-welcome-mascot" />
          <h1>Welcome to Chess Tutor</h1>
          <p className="ct-muted">
            Learn, play and train in one place. What should we call you, and where should we start?
          </p>
          <label className="ct-field">
            <span>Your name (optional)</span>
            <input
              type="text"
              value={welcomeName}
              maxLength={24}
              placeholder="e.g. Kenny"
              onChange={e => setWelcomeName(e.target.value)}
            />
          </label>
          <div className="ct-welcome-levels">
            {[
              { id: "new" as const, title: "I'm new to chess", detail: "Start with the basics in Learn (400)" },
              { id: "rules" as const, title: "I know the rules", detail: "Play bots and puzzles at a comfortable pace (800)" },
              { id: "player" as const, title: "I play online", detail: "Link Chess.com or Lichess for your real rating (1200)" }
            ].map(opt => (
              <button
                key={opt.id}
                type="button"
                className="ct-choice-card"
                onClick={() => onCompleteWelcome(welcomeName.trim(), opt.id)}
              >
                <div>
                  <strong>{opt.title}</strong>
                  <small>{opt.detail}</small>
                </div>
                <ChevronRight size={18} />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (route.view === "bots") {
    return (
      <BotsPage
        roster={BOT_ROSTER}
        customBots={customBots}
        onBack={() => setRoute({ view: "hub" })}
        onPickBot={bot => setRoute({ view: "bot-setup", bot })}
        onBuildNew={() => setRoute({ view: "builder" })}
        onEditBot={bot => setRoute({ view: "builder", editing: bot })}
        onDeleteBot={onDeleteCustomBot}
        onWatchTwo={() => setRoute({ view: "watch" })}
      />
    );
  }

  if (route.view === "bot-setup") {
    return (
      <BotSetupPage
        bot={route.bot}
        onBack={() => setRoute({ view: "bots" })}
        onStart={launch => onLaunchPlay(launch)}
      />
    );
  }

  if (route.view === "builder") {
    return (
      <BotBuilderPage
        initial={route.editing}
        openingTree={openingTree}
        onBack={() => setRoute({ view: "bots" })}
        onSave={bot => {
          onSaveCustomBot(bot);
          setRoute({ view: "bots" });
        }}
      />
    );
  }

  if (route.view === "battle") {
    return (
      <OpeningBattlePage
        openingTree={openingTree}
        presetOpeningName={route.presetOpeningName}
        effectiveRating={effectiveRating}
        onBack={() => setRoute({ view: "hub" })}
        onStart={(plan, tc) =>
          onLaunchPlay({
            mode: "battle",
            bot: closestRosterBot(effectiveRating).profile,
            plan,
            timeControl: tc
          })
        }
      />
    );
  }

  if (route.view === "position") {
    return (
      <PositionSetupPage
        settings={settings}
        effectiveRating={effectiveRating}
        onBack={() => setRoute({ view: "hub" })}
        onStartPlay={(fen, color) =>
          onLaunchPlay({
            mode: "bot",
            bot: quickMatchBot,
            playerColor: color,
            timeControl: TIME_CONTROLS[0],
            takebacks: true,
            hints: true,
            evalBar: false,
            startFen: fen
          })
        }
        onExplore={fen =>
          onLaunchPlay({
            mode: "explore",
            startFen: fen,
            title: "Custom Position"
          })
        }
      />
    );
  }

  if (route.view === "watch") {
    return (
      <WatchSetupPage
        bots={[...customBots, ...BOT_ROSTER.map(r => r.profile)]}
        onBack={() => setRoute({ view: "bots" })}
        onStart={(whiteBot, blackBot) => onLaunchPlay({ mode: "watch", whiteBot, blackBot })}
      />
    );
  }

  if (route.view === "explore") {
    return (
      <ExploreSetupPage
        onBack={() => setRoute({ view: "hub" })}
        onStart={(fen, engineSide, engineElo) =>
          onLaunchPlay({
            mode: "explore",
            startFen: fen,
            engineSide,
            engineElo,
            title: "Explore & Analyse"
          })
        }
      />
    );
  }

  const greetingName = settings.playerName || "Player";

  return (
    <div className="ct-page">
      <header className="ct-page-header">
        <div>
          <div className="ct-eyebrow">PLAY HUB</div>
          <h1>Hi, {greetingName}</h1>
        </div>
        <div className="ct-header-stats">
          <div className="ct-stat-badge" title="Daily puzzle streak">
            <Flame size={16} className={streak > 0 ? "ct-accent-text" : ""} />
            <span className="mono-num">{streak}</span>
          </div>
          <div className="ct-stat-badge" title="Your Chess Tutor rating">
            <span className="ct-muted">Rating</span>
            <strong className="mono-num">{effectiveRating}</strong>
          </div>
          <button
            type="button"
            className="ct-btn ct-btn-ghost ct-hide-mobile"
            onClick={onOpenHealthCheck}
            title="Stockfish 19 diagnostics"
          >
            <Cpu size={16} /> Engine
          </button>
        </div>
      </header>

      {/* Primary Top Grid: Continue + Quick Match */}
      <div className="ct-home-hero-grid">
        {activeGame ? (
          <div className="ct-hero-card">
            <div className="ct-hero-copy">
              <div className="ct-kicker">Resume Game</div>
              <h2>vs {activeGame.botName} ({activeGame.botRating})</h2>
              <p className="ct-muted">
                {Math.ceil(activeGame.uciMoves.length / 2)} moves played · You play{" "}
                {activeGame.playerColor === "w" ? "White" : "Black"}
              </p>
              <button
                type="button"
                className="ct-btn ct-btn-primary"
                onClick={() => {
                  const found = [...customBots, ...BOT_ROSTER.map(b => b.profile)].find(
                    b => b.id === activeGame.botId
                  ) ?? quickMatchBot;
                  onLaunchPlay({
                    mode: "bot",
                    bot: found,
                    playerColor: activeGame.playerColor,
                    timeControl: TIME_CONTROLS[0],
                    takebacks: true,
                    hints: true,
                    evalBar: false,
                    resumeSnapshot: activeGame
                  });
                }}
              >
                <Play size={16} /> Continue Game
              </button>
            </div>
            <img src={botAssetUrl(activeGame.botFace)} alt={activeGame.botName} className="ct-hero-bot-img" />
          </div>
        ) : nextLesson ? (
          <div className="ct-hero-card">
            <div className="ct-hero-copy">
              <div className="ct-kicker">{nextLesson.started ? "Continue Learning" : "Up Next in Learn"}</div>
              <h2>{nextLesson.course.title}</h2>
              <p className="ct-muted">
                Lesson {nextLesson.number} of {nextLesson.total} · {nextLesson.lesson.title}
              </p>
              <button
                type="button"
                className="ct-btn ct-btn-primary"
                onClick={() => onOpenLesson(nextLesson.course, nextLesson.lesson.id)}
              >
                <Play size={16} /> {nextLesson.started ? "Resume Lesson" : "Start Lesson"}
              </button>
            </div>
            <img
              src={mascotAssetUrl(settings.mascotId, "ready")}
              alt="Coach"
              className="ct-hero-bot-img"
            />
          </div>
        ) : null}

        <div className="ct-hero-card">
          <div className="ct-hero-copy">
            <div className="ct-kicker">Quick Match</div>
            <h2>Play {quickMatchBot.name} ({quickMatchBot.rating})</h2>
            <p className="ct-muted">Matched closely to your {effectiveRating} rating.</p>
            <div className="ct-btn-row">
              <button
                type="button"
                className="ct-btn ct-btn-primary"
                onClick={() =>
                  onLaunchPlay({
                    mode: "bot",
                    bot: quickMatchBot,
                    playerColor: Math.random() < 0.5 ? "w" : "b",
                    timeControl: TIME_CONTROLS[2],
                    takebacks: true,
                    hints: true,
                    evalBar: false
                  })
                }
              >
                <Swords size={16} /> Play 10 min
              </button>
              <button
                type="button"
                className="ct-btn ct-btn-secondary"
                onClick={() => setRoute({ view: "bot-setup", bot: quickMatchBot })}
              >
                Options
              </button>
            </div>
          </div>
          <img src={botAssetUrl(quickMatchBot.face)} alt={quickMatchBot.name} className="ct-hero-bot-img" />
        </div>
      </div>

      {/* Action Tiles: Daily Challenge & Recommended Next Step */}
      <section className="ct-section">
        <div className="ct-two-col-grid">
          <button
            type="button"
            className="ct-action-tile"
            disabled={!dailyPuzzle}
            onClick={() => dailyPuzzle && onOpenDailyPuzzle(dailyPuzzle)}
          >
            <div className="ct-action-tile-body">
              <div className="ct-kicker">Daily Puzzle</div>
              <strong>{todaySolvedDaily ? "Solved today!" : "Today's tactical test"}</strong>
              <small>
                {dailyPuzzle ? `Rated ${dailyPuzzle.rating} · Ready offline` : "Loading puzzle pack…"}
              </small>
            </div>
            <ChevronRight size={18} />
          </button>

          <button
            type="button"
            className="ct-action-tile"
            onClick={() => {
              if (dueMistakesCount > 0) onOpenMistakesReview();
              else setRoute({ view: "battle" });
            }}
          >
            <div className="ct-action-tile-body">
              <div className="ct-kicker">Recommended</div>
              <strong>
                {dueMistakesCount > 0
                  ? `Review ${dueMistakesCount} game mistake${dueMistakesCount === 1 ? "" : "s"}`
                  : "Practise an Opening Battle"}
              </strong>
              <small>
                {dueMistakesCount > 0
                  ? "Spaced repetition from your own games"
                  : "Test your repertoire against an adaptive bot"}
              </small>
            </div>
            <ChevronRight size={18} />
          </button>
        </div>
      </section>

      {/* Meet the Bots Horizontal Strip */}
      <section className="ct-section">
        <div className="ct-section-head">
          <h2>Meet the bots</h2>
          <button type="button" className="ct-text-btn" onClick={() => setRoute({ view: "bots" })}>
            See all ({BOT_ROSTER.length + customBots.length}) <ChevronRight size={15} />
          </button>
        </div>
        <div className="ct-bot-carousel">
          {customBots.map(bot => (
            <button
              key={bot.id}
              type="button"
              className="ct-bot-card"
              onClick={() => setRoute({ view: "bot-setup", bot })}
            >
              <img src={botAssetUrl(bot.face)} alt={bot.name} className="ct-bot-avatar" />
              <strong>{bot.name}</strong>
              <span className="mono-num">{bot.rating}</span>
              <small>Custom</small>
            </button>
          ))}
          {BOT_ROSTER.map(entry => (
            <button
              key={entry.profile.id}
              type="button"
              className="ct-bot-card"
              onClick={() => setRoute({ view: "bot-setup", bot: entry.profile })}
            >
              <img src={botAssetUrl(entry.profile.face)} alt={entry.profile.name} className="ct-bot-avatar" />
              <strong>{entry.profile.name}</strong>
              <span className="mono-num">{entry.profile.rating}</span>
              <small>{BOT_STYLES[entry.profile.style].label}</small>
            </button>
          ))}
          <button
            type="button"
            className="ct-bot-card ct-bot-card-add"
            onClick={() => setRoute({ view: "builder" })}
          >
            <div className="ct-bot-add-circle">
              <Plus size={22} />
            </div>
            <strong>Build a bot</strong>
            <small>Custom style &amp; book</small>
          </button>
        </div>
      </section>

      {/* More Ways to Play */}
      <section className="ct-section">
        <div className="ct-section-head">
          <h2>More ways to play</h2>
        </div>
        <div className="ct-modes-grid">
          <button type="button" className="ct-mode-tile" onClick={() => setRoute({ view: "battle" })}>
            <img src="/assets/art/art_battle_night.webp" alt="" className="ct-mode-art" />
            <div>
              <strong>Opening Battle</strong>
              <small>Play it, Drill it, or Surprise me from 3,865 lines</small>
            </div>
          </button>
          <button type="button" className="ct-mode-tile" onClick={() => setRoute({ view: "position" })}>
            <img src="/assets/art/art_position_night.webp" alt="" className="ct-mode-art" />
            <div>
              <strong>Play from a Position</strong>
              <small>Set up any FEN or custom board and challenge Stockfish</small>
            </div>
          </button>
          <button type="button" className="ct-mode-tile" onClick={() => setRoute({ view: "explore" })}>
            <img src="/assets/art/art_explore_night.webp" alt="" className="ct-mode-art" />
            <div>
              <strong>Explore &amp; Analyse</strong>
              <small>Free board with 3-line Stockfish 19 Multi-PV</small>
            </div>
          </button>
          <button type="button" className="ct-mode-tile" onClick={() => setRoute({ view: "watch" })}>
            <Eye size={32} className="ct-accent-text" />
            <div>
              <strong>Watch Two Bots</strong>
              <small>Pit any two bots against each other live</small>
            </div>
          </button>
        </div>
      </section>
    </div>
  );
}

/* ==========================================================================
   Sub-pages of Home
   ========================================================================== */

function BotsPage({
  roster,
  customBots,
  onBack,
  onPickBot,
  onBuildNew,
  onEditBot,
  onDeleteBot,
  onWatchTwo
}: {
  roster: typeof BOT_ROSTER;
  customBots: BotProfile[];
  onBack: () => void;
  onPickBot: (b: BotProfile) => void;
  onBuildNew: () => void;
  onEditBot: (b: BotProfile) => void;
  onDeleteBot: (id: string) => void;
  onWatchTwo: () => void;
}) {
  return (
    <div className="ct-page">
      <div className="ct-subpage-bar">
        <button type="button" className="ct-icon-btn" onClick={onBack}>
          <ArrowLeft size={18} /> <span>Home</span>
        </button>
        <h1>All Bots</h1>
        <div className="ct-btn-row">
          <button type="button" className="ct-btn ct-btn-secondary" onClick={onWatchTwo}>
            <Eye size={16} /> Watch two
          </button>
          <button type="button" className="ct-btn ct-btn-primary" onClick={onBuildNew}>
            <Plus size={16} /> Build bot
          </button>
        </div>
      </div>

      {customBots.length > 0 && (
        <section className="ct-section">
          <h2>My Bots</h2>
          <div className="ct-roster-grid">
            {customBots.map(bot => (
              <div key={bot.id} className="ct-roster-card">
                <button type="button" className="ct-roster-main" onClick={() => onPickBot(bot)}>
                  <img src={botAssetUrl(bot.face)} alt={bot.name} className="ct-bot-avatar" />
                  <div>
                    <strong>{bot.name}</strong>
                    <div className="mono-num">
                      {bot.rating} · {BOT_STYLES[bot.style].label}
                    </div>
                  </div>
                </button>
                <div className="ct-roster-actions">
                  <button type="button" className="ct-mini-btn" onClick={() => onEditBot(bot)} title="Edit">
                    <Pencil size={14} />
                  </button>
                  <button type="button" className="ct-mini-btn" onClick={() => onDeleteBot(bot.id)} title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="ct-section">
        <h2>Chess Tutor Roster</h2>
        <div className="ct-roster-grid">
          {roster.map(entry => (
            <div key={entry.profile.id} className="ct-roster-card">
              <button type="button" className="ct-roster-main" onClick={() => onPickBot(entry.profile)}>
                <img src={botAssetUrl(entry.profile.face)} alt={entry.profile.name} className="ct-bot-avatar" />
                <div>
                  <strong>{entry.profile.name}</strong>
                  <div className="mono-num">
                    {entry.profile.rating} · {BOT_STYLES[entry.profile.style].label}
                  </div>
                  <p className="ct-muted">{entry.tagline}</p>
                </div>
                <ChevronRight size={18} />
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function BotSetupPage({
  bot,
  onBack,
  onStart
}: {
  bot: BotProfile;
  onBack: () => void;
  onStart: (launch: PlayBoardLaunch) => void;
}) {
  const [sideChoice, setSideChoice] = useState<"w" | "b" | "random">("w");
  const [tc, setTc] = useState<TimeControlOption>(TIME_CONTROLS[0]);
  const [takebacks, setTakebacks] = useState(true);
  const [hints, setHints] = useState(true);
  const [evalBar, setEvalBar] = useState(false);

  return (
    <div className="ct-page">
      <div className="ct-subpage-bar">
        <button type="button" className="ct-icon-btn" onClick={onBack}>
          <ArrowLeft size={18} /> <span>Bots</span>
        </button>
        <h1>Play {bot.name}</h1>
      </div>

      <div className="ct-setup-card">
        <div className="ct-setup-bot-head">
          <img src={botAssetUrl(bot.face)} alt={bot.name} className="ct-bot-avatar-lg" />
          <div>
            <h2>{bot.name}</h2>
            <div className="mono-num">
              Rating {bot.rating} · {BOT_STYLES[bot.style].label}
            </div>
            {(bot.whiteOpenings.length > 0 || bot.blackOpenings.length > 0) && (
              <small className="ct-muted">
                Plays {[...bot.whiteOpenings, ...bot.blackOpenings].slice(0, 3).join(", ")}
              </small>
            )}
          </div>
        </div>

        <div className="ct-control-group">
          <label>You play</label>
          <div className="ct-segmented">
            {[
              { id: "w" as const, label: "White" },
              { id: "random" as const, label: "Random" },
              { id: "b" as const, label: "Black" }
            ].map(opt => (
              <button
                key={opt.id}
                type="button"
                className={sideChoice === opt.id ? "is-active" : ""}
                onClick={() => setSideChoice(opt.id)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ct-control-group">
          <label>Time control</label>
          <div className="ct-segmented">
            {TIME_CONTROLS.map(opt => (
              <button
                key={opt.id}
                type="button"
                className={tc.id === opt.id ? "is-active" : ""}
                onClick={() => setTc(opt)}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ct-toggle-list">
          <label className="ct-toggle-row">
            <span>Allow takebacks</span>
            <input type="checkbox" checked={takebacks} onChange={e => setTakebacks(e.target.checked)} />
          </label>
          <label className="ct-toggle-row">
            <span>Allow engine hints</span>
            <input type="checkbox" checked={hints} onChange={e => setHints(e.target.checked)} />
          </label>
          <label className="ct-toggle-row">
            <span>Show live evaluation bar</span>
            <input type="checkbox" checked={evalBar} onChange={e => setEvalBar(e.target.checked)} />
          </label>
        </div>

        <button
          type="button"
          className="ct-btn ct-btn-primary ct-btn-lg"
          onClick={() => {
            const playerColor = sideChoice === "random" ? (Math.random() < 0.5 ? "w" : "b") : sideChoice;
            onStart({ mode: "bot", bot, playerColor, timeControl: tc, takebacks, hints, evalBar });
          }}
        >
          <Swords size={18} /> Start Game
        </button>
      </div>
    </div>
  );
}

function BotBuilderPage({
  initial,
  openingTree,
  onBack,
  onSave
}: {
  initial?: BotProfile;
  openingTree: OpeningTree;
  onBack: () => void;
  onSave: (bot: BotProfile) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "My Coach Bot");
  const [face, setFace] = useState(initial?.face ?? "juno");
  const [rating, setRating] = useState(initial?.rating ?? 1200);
  const [style, setStyle] = useState<BotStyleId>(initial?.style ?? "balanced");
  const [aggression, setAggression] = useState(initial?.aggression ?? 0);
  const [trades, setTrades] = useState(initial?.trades ?? 0);
  const [mistakeLevel, setMistakeLevel] = useState(initial?.mistakeLevel ?? 1);
  const [thinkSpeed, setThinkSpeed] = useState<ThinkSpeed>(initial?.thinkSpeed ?? "normal");
  const [resign, setResign] = useState<ResignPolicy>(initial?.resign ?? "when-lost");
  const [whiteOpenings, setWhiteOpenings] = useState<string[]>(initial?.whiteOpenings ?? []);
  const [blackOpenings, setBlackOpenings] = useState<string[]>(initial?.blackOpenings ?? []);
  const [openingFilter, setOpeningFilter] = useState("");

  const families = useMemo(
    () => openingTree.searchFamilies(openingFilter, 24).map(f => f.name),
    [openingTree, openingFilter]
  );

  const toggleOpening = (side: "w" | "b", fam: string) => {
    const setter = side === "w" ? setWhiteOpenings : setBlackOpenings;
    setter(prev => (prev.includes(fam) ? prev.filter(x => x !== fam) : [...prev, fam]));
  };

  return (
    <div className="ct-page">
      <div className="ct-subpage-bar">
        <button type="button" className="ct-icon-btn" onClick={onBack}>
          <ArrowLeft size={18} /> <span>Bots</span>
        </button>
        <h1>{initial ? "Edit Custom Bot" : "Build a Bot"}</h1>
      </div>

      <div className="ct-setup-card">
        <label className="ct-field">
          <span>Bot Name</span>
          <input type="text" maxLength={24} value={name} onChange={e => setName(e.target.value)} />
        </label>

        <div className="ct-control-group">
          <label>Avatar</label>
          <div className="ct-avatar-picker">
            {BOT_ROSTER.map(b => (
              <button
                key={b.profile.id}
                type="button"
                className={`ct-avatar-pick ${face === b.profile.id ? "is-active" : ""}`}
                onClick={() => setFace(b.profile.id)}
              >
                <img src={botAssetUrl(b.profile.face)} alt={b.profile.name} />
              </button>
            ))}
          </div>
        </div>

        <div className="ct-control-group">
          <label>
            Target Rating: <strong className="mono-num">{rating}</strong>
          </label>
          <input
            type="range"
            min={250}
            max={3000}
            step={50}
            value={rating}
            onChange={e => setRating(Number(e.target.value))}
          />
        </div>

        <div className="ct-control-group">
          <label>Style Preset</label>
          <div className="ct-chip-wrap">
            {(Object.keys(BOT_STYLES) as BotStyleId[]).map(sId => (
              <button
                key={sId}
                type="button"
                className={`ct-chip-btn ${style === sId ? "is-active" : ""}`}
                onClick={() => {
                  setStyle(sId);
                  setAggression(BOT_STYLES[sId].aggression);
                  setTrades(BOT_STYLES[sId].trades);
                }}
              >
                {BOT_STYLES[sId].label}
              </button>
            ))}
          </div>
        </div>

        <div className="ct-two-col-grid">
          <div className="ct-control-group">
            <label>Aggression ({aggression.toFixed(1)})</label>
            <input
              type="range"
              min={-1}
              max={1}
              step={0.1}
              value={aggression}
              onChange={e => setAggression(Number(e.target.value))}
            />
          </div>
          <div className="ct-control-group">
            <label>Trade Preference ({trades.toFixed(1)})</label>
            <input
              type="range"
              min={-1}
              max={1}
              step={0.1}
              value={trades}
              onChange={e => setTrades(Number(e.target.value))}
            />
          </div>
        </div>

        <div className="ct-two-col-grid">
          <div className="ct-control-group">
            <label>Mistake Frequency ({mistakeLevel.toFixed(1)}x)</label>
            <input
              type="range"
              min={0}
              max={2}
              step={0.1}
              value={mistakeLevel}
              onChange={e => setMistakeLevel(Number(e.target.value))}
            />
          </div>
          <div className="ct-control-group">
            <label>Thinking Pace</label>
            <div className="ct-segmented">
              {(["fast", "normal", "slow"] as ThinkSpeed[]).map(sp => (
                <button
                  key={sp}
                  type="button"
                  className={thinkSpeed === sp ? "is-active" : ""}
                  onClick={() => setThinkSpeed(sp)}
                >
                  {sp}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="ct-control-group">
          <label>Resignation Policy</label>
          <div className="ct-segmented">
            {[
              { id: "never" as const, label: "Never" },
              { id: "when-lost" as const, label: "When lost" },
              { id: "early" as const, label: "Early" }
            ].map(r => (
              <button
                key={r.id}
                type="button"
                className={resign === r.id ? "is-active" : ""}
                onClick={() => setResign(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ct-control-group">
          <label>Opening Repertoire (White: {whiteOpenings.length} · Black: {blackOpenings.length})</label>
          <input
            type="search"
            placeholder="Filter opening families (e.g. Italian, Sicilian, London)…"
            value={openingFilter}
            onChange={e => setOpeningFilter(e.target.value)}
          />
          <div className="ct-repertoire-picker">
            {families.map(fam => (
              <div key={fam} className="ct-rep-row">
                <span>{fam}</span>
                <div className="ct-rep-btns">
                  <button
                    type="button"
                    className={`ct-mini-btn ${whiteOpenings.includes(fam) ? "is-active" : ""}`}
                    onClick={() => toggleOpening("w", fam)}
                  >
                    W
                  </button>
                  <button
                    type="button"
                    className={`ct-mini-btn ${blackOpenings.includes(fam) ? "is-active" : ""}`}
                    onClick={() => toggleOpening("b", fam)}
                  >
                    B
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="ct-btn ct-btn-primary ct-btn-lg"
          onClick={() =>
            onSave({
              id: initial?.id ?? `custom_${generateUuid()}`,
              name: name.trim() || "Custom Bot",
              rating,
              style,
              aggression,
              trades,
              mistakeLevel,
              thinkSpeed,
              resign,
              whiteOpenings,
              blackOpenings,
              face,
              custom: true
            })
          }
        >
          Save Bot
        </button>
      </div>
    </div>
  );
}

function OpeningBattlePage({
  openingTree,
  presetOpeningName,
  onBack,
  onStart
}: {
  openingTree: OpeningTree;
  presetOpeningName?: string;
  effectiveRating: number;
  onBack: () => void;
  onStart: (plan: ReturnType<typeof createBattlePlan>, tc: TimeControlOption) => void;
}) {
  const [query, setQuery] = useState(presetOpeningName ?? "");
  const [selectedLine, setSelectedLine] = useState<OpeningLine | null>(() =>
    presetOpeningName ? openingTree.presetLine(presetOpeningName) : openingTree.presetLine("Italian Game")
  );
  const [expandedFamily, setExpandedFamily] = useState<string | null>(null);
  const [sideChoice, setSideChoice] = useState<"w" | "b" | "random">("w");
  const [mode, setMode] = useState<BattleMode>("play");
  const [exactReplies, setExactReplies] = useState(true);

  const families = useMemo(() => openingTree.searchFamilies(query, 40), [openingTree, query]);

  return (
    <div className="ct-page">
      <div className="ct-subpage-bar">
        <button type="button" className="ct-icon-btn" onClick={onBack}>
          <ArrowLeft size={18} /> <span>Home</span>
        </button>
        <h1>Opening Battle</h1>
      </div>

      <div className="ct-two-col-grid">
        <div className="ct-card">
          <div className="ct-search-box">
            <Search size={16} />
            <input
              type="search"
              placeholder="Search 3,865 openings (e.g. Italian, Sicilian Najdorf, London)…"
              value={query}
              onChange={e => setQuery(e.target.value)}
            />
          </div>

          <div className="ct-opening-family-list">
            {families.map(fam => {
              const isExpanded = expandedFamily === fam.name;
              const groups = isExpanded ? groupFamilyLines(fam) : [];
              return (
                <div key={fam.name} className="ct-opening-fam">
                  <button
                    type="button"
                    className="ct-opening-fam-btn"
                    onClick={() => setExpandedFamily(isExpanded ? null : fam.name)}
                  >
                    <div>
                      <strong>{fam.name}</strong>
                      <small>{fam.lines.length} variations</small>
                    </div>
                    <ChevronRight size={16} className={isExpanded ? "rot-90" : ""} />
                  </button>
                  {isExpanded && (
                    <div className="ct-opening-lines">
                      {groups.slice(0, 8).map(g => (
                        <div key={g.name} className="ct-opening-group">
                          <div className="ct-kicker">{g.name}</div>
                          {g.lines.slice(0, 6).map((line, i) => (
                            <button
                              key={`${line.eco}-${line.name}-${i}`}
                              type="button"
                              className={`ct-line-btn ${selectedLine?.name === line.name ? "is-selected" : ""}`}
                              onClick={() => setSelectedLine(line)}
                            >
                              <span className="mono-num">{line.eco}</span>
                              <span>{line.name}</span>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="ct-setup-card">
          <div>
            <div className="ct-kicker">Selected Opening</div>
            <h2>{selectedLine ? selectedLine.name : "Pick an opening"}</h2>
            {selectedLine && (
              <p className="ct-muted mono-num">
                {selectedLine.eco} · {selectedLine.moves.length} plies ({selectedLine.moves.slice(0, 8).join(" ")})
              </p>
            )}
          </div>

          <div className="ct-control-group">
            <label>You play</label>
            <div className="ct-segmented">
              {[
                { id: "w" as const, label: "White" },
                { id: "random" as const, label: "Random" },
                { id: "b" as const, label: "Black" }
              ].map(o => (
                <button
                  key={o.id}
                  type="button"
                  className={sideChoice === o.id ? "is-active" : ""}
                  onClick={() => setSideChoice(o.id)}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>

          <div className="ct-control-group">
            <label>Battle Mode</label>
            <div className="ct-segmented">
              {[
                { id: "play" as const, label: "Play it" },
                { id: "drill" as const, label: "Drill it" },
                { id: "surprise" as const, label: "Surprise me" }
              ].map(m => (
                <button
                  key={m.id}
                  type="button"
                  className={mode === m.id ? "is-active" : ""}
                  onClick={() => setMode(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>

          <label className="ct-toggle-row">
            <span>Bot sticks strictly to exact replies</span>
            <input type="checkbox" checked={exactReplies} onChange={e => setExactReplies(e.target.checked)} />
          </label>

          <button
            type="button"
            className="ct-btn ct-btn-primary ct-btn-lg"
            disabled={!selectedLine}
            onClick={() => {
              if (!selectedLine) return;
              const playerColor = sideChoice === "random" ? (Math.random() < 0.5 ? "w" : "b") : sideChoice;
              const plan = createBattlePlan(openingTree, {
                line: selectedLine,
                playerColor,
                mode,
                exactReplies
              });
              onStart(plan, TIME_CONTROLS[0]);
            }}
          >
            <Swords size={18} /> Start Opening Battle
          </button>
        </div>
      </div>
    </div>
  );
}

function PositionSetupPage({
  settings,
  onBack,
  onStartPlay,
  onExplore
}: {
  settings: AppSettings;
  effectiveRating: number;
  onBack: () => void;
  onStartPlay: (fen: string, color: "w" | "b") => void;
  onExplore: (fen: string) => void;
}) {
  const [fen, setFen] = useState("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  const [side, setSide] = useState<"w" | "b">("w");
  const [error, setError] = useState<string | null>(null);

  const validateAndRun = (cb: (validFen: string) => void) => {
    try {
      const c = new Chess(fen.trim());
      setError(null);
      cb(c.fen());
    } catch {
      setError("Invalid FEN string. Check piece placement, turn, castling, and kings.");
    }
  };

  return (
    <div className="ct-page">
      <div className="ct-subpage-bar">
        <button type="button" className="ct-icon-btn" onClick={onBack}>
          <ArrowLeft size={18} /> <span>Home</span>
        </button>
        <h1>Play from Position</h1>
      </div>

      <div className="ct-two-col-grid">
        <div>
          <BoardHost
            fen={fen}
            orientation={side}
            interactive={false}
            boardColorsId={settings.boardThemeId}
            pieceSetId={settings.pieceSetId}
            showCoordinates={settings.showCoordinates}
            maxBoardPx={420}
          />
        </div>

        <div className="ct-setup-card">
          <label className="ct-field">
            <span>FEN Position</span>
            <textarea
              rows={3}
              value={fen}
              onChange={e => setFen(e.target.value)}
              className="mono-num"
            />
          </label>
          {error && <p className="ct-error-text">{error}</p>}

          <div className="ct-chip-wrap">
            <button
              type="button"
              className="ct-chip-btn"
              onClick={() => setFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")}
            >
              Starting Position
            </button>
            <button
              type="button"
              className="ct-chip-btn"
              onClick={() => setFen("4k3/8/8/8/8/8/4P3/4K3 w - - 0 1")}
            >
              King &amp; Pawn Endgame
            </button>
            <button
              type="button"
              className="ct-chip-btn"
              onClick={() => setFen("3rk3/8/8/8/8/8/4R3/4K3 w - - 0 1")}
            >
              Rook Endgame
            </button>
          </div>

          <div className="ct-control-group">
            <label>You play</label>
            <div className="ct-segmented">
              <button type="button" className={side === "w" ? "is-active" : ""} onClick={() => setSide("w")}>
                White
              </button>
              <button type="button" className={side === "b" ? "is-active" : ""} onClick={() => setSide("b")}>
                Black
              </button>
            </div>
          </div>

          <div className="ct-btn-row">
            <button
              type="button"
              className="ct-btn ct-btn-primary"
              onClick={() => validateAndRun(valid => onStartPlay(valid, side))}
            >
              <Swords size={16} /> Play vs Bot
            </button>
            <button
              type="button"
              className="ct-btn ct-btn-secondary"
              onClick={() => validateAndRun(valid => onExplore(valid))}
            >
              <Compass size={16} /> Analyse
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function WatchSetupPage({
  bots,
  onBack,
  onStart
}: {
  bots: BotProfile[];
  onBack: () => void;
  onStart: (white: BotProfile, black: BotProfile) => void;
}) {
  const [whiteId, setWhiteId] = useState(bots[4]?.id ?? bots[0].id);
  const [blackId, setBlackId] = useState(bots[5]?.id ?? bots[1]?.id ?? bots[0].id);

  const white = bots.find(b => b.id === whiteId) ?? bots[0];
  const black = bots.find(b => b.id === blackId) ?? bots[0];

  return (
    <div className="ct-page">
      <div className="ct-subpage-bar">
        <button type="button" className="ct-icon-btn" onClick={onBack}>
          <ArrowLeft size={18} /> <span>Bots</span>
        </button>
        <h1>Watch Two Bots</h1>
      </div>

      <div className="ct-setup-card">
        <div className="ct-two-col-grid">
          <div className="ct-control-group">
            <label>White Bot</label>
            <select value={whiteId} onChange={e => setWhiteId(e.target.value)}>
              {bots.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.rating})
                </option>
              ))}
            </select>
          </div>
          <div className="ct-control-group">
            <label>Black Bot</label>
            <select value={blackId} onChange={e => setBlackId(e.target.value)}>
              {bots.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.rating})
                </option>
              ))}
            </select>
          </div>
        </div>

        <button
          type="button"
          className="ct-btn ct-btn-primary ct-btn-lg"
          onClick={() => onStart(white, black)}
        >
          <Eye size={18} /> Start Bot Match
        </button>
      </div>
    </div>
  );
}

function ExploreSetupPage({
  onBack,
  onStart
}: {
  onBack: () => void;
  onStart: (fen: string, engineSide: "w" | "b" | null, engineElo: number) => void;
}) {
  const [engineSide, setEngineSide] = useState<"none" | "w" | "b">("none");
  const [elo, setElo] = useState(1800);

  return (
    <div className="ct-page">
      <div className="ct-subpage-bar">
        <button type="button" className="ct-icon-btn" onClick={onBack}>
          <ArrowLeft size={18} /> <span>Home</span>
        </button>
        <h1>Explore &amp; Analyse</h1>
      </div>

      <div className="ct-setup-card">
        <p className="ct-muted">
          Test variations freely with Stockfish 19 Multi-PV lines, or ask the engine to reply to one side.
        </p>

        <div className="ct-control-group">
          <label>Engine Replies As</label>
          <div className="ct-segmented">
            {[
              { id: "none" as const, label: "Free board" },
              { id: "b" as const, label: "Engine plays Black" },
              { id: "w" as const, label: "Engine plays White" }
            ].map(o => (
              <button
                key={o.id}
                type="button"
                className={engineSide === o.id ? "is-active" : ""}
                onClick={() => setEngineSide(o.id)}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        {engineSide !== "none" && (
          <div className="ct-control-group">
            <label>
              Engine Strength: <strong className="mono-num">{elo === 3000 ? "Max" : elo}</strong>
            </label>
            <input type="range" min={800} max={3000} step={100} value={elo} onChange={e => setElo(Number(e.target.value))} />
          </div>
        )}

        <button
          type="button"
          className="ct-btn ct-btn-primary ct-btn-lg"
          onClick={() =>
            onStart(
              "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
              engineSide === "none" ? null : engineSide,
              elo
            )
          }
        >
          <Sparkles size={18} /> Open Analysis Board
        </button>
      </div>
    </div>
  );
}
