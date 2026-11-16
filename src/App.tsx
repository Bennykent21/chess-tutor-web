import { useEffect, useMemo, useState } from "react";
import { BookOpen, Home, Puzzle as PuzzleIcon, Target, User } from "lucide-react";
import { LessonCourse, LessonProgressRecord, loadLessonLibrary } from "./domain/lessons";
import { OpeningTree, loadOpeningTree } from "./domain/openings";
import {
  PUZZLES_TO_PASS_LEVEL,
  PuzzlePack,
  loadPuzzlePack,
  selectRelatedPuzzles
} from "./domain/puzzles";
import { GameReviewReport } from "./domain/account";
import { BotProfile } from "./domain/bots";
import {
  ActiveGameSnapshot,
  AppSettings,
  LinkedAccountInfo,
  OnboardingProfile,
  PuzzleStoreState,
  StartingLevelId,
  StoredAccountGame,
  TutorGameMistake,
  TutorGameRecord,
  TutorReviewItem,
  applyReviewResult,
  clearLocalData,
  countDueReviews,
  generateUuid,
  loadActiveGame,
  loadAppSettings,
  loadCachedAnalyses,
  loadCustomBots,
  loadGameHistory,
  loadGameMistakes,
  loadImportedAccountGames,
  loadLessonProgressMap,
  loadLinkedAccounts,
  loadOnboarding,
  loadPuzzleStore,
  loadReviewSchedule,
  localDateKey,
  saveAppSettings,
  saveCachedAnalysis,
  saveCustomBots,
  saveGameMistakes,
  saveGameRecord,
  saveImportedAccountGames,
  saveLessonProgressMap,
  saveLinkedAccounts,
  saveOnboarding,
  savePuzzleStore,
  saveReportedIssue,
  saveReviewSchedule,
  TrainStore,
  loadTrainStore,
  saveTrainStore
} from "./lib/storage";
import { HomeSubRoute, HomeView } from "./views/HomeView";
import { LearnSubRoute, LearnView } from "./views/LearnView";
import { MistakeRunItem, PuzzlesSubRoute, PuzzlesView, gameMistakeToPuzzle } from "./views/PuzzlesView";
import { AccountSubRoute, AccountView } from "./views/AccountView";
import { PlayBoardLaunch, PlayBoardView } from "./views/PlayBoardView";
import { TrainSubRoute, TrainView, isTrainFocus } from "./views/TrainView";

type MainTab = "home" | "learn" | "train" | "puzzles" | "account";

const NAV_ITEMS: { id: MainTab; label: string; icon: typeof Home }[] = [
  { id: "home", label: "Home", icon: Home },
  { id: "learn", label: "Learn", icon: BookOpen },
  { id: "train", label: "Train", icon: Target },
  { id: "puzzles", label: "Puzzles", icon: PuzzleIcon },
  { id: "account", label: "Account", icon: User }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<MainTab>("home");
  const [homeRoute, setHomeRoute] = useState<HomeSubRoute>({ view: "hub" });
  const [learnRoute, setLearnRoute] = useState<LearnSubRoute>({ view: "hub" });
  const [trainRoute, setTrainRoute] = useState<TrainSubRoute>({ view: "hub" });
  const [trainStore, setTrainStore] = useState<TrainStore>(() => loadTrainStore());
  const [puzzlesRoute, setPuzzlesRoute] = useState<PuzzlesSubRoute>({ view: "home" });
  const [accountRoute, setAccountRoute] = useState<AccountSubRoute>({ view: "overview" });
  const [playLaunch, setPlayLaunch] = useState<PlayBoardLaunch | null>(null);

  // Persistent client-side state (100% localStorage, zero Supabase)
  const [settings, setSettings] = useState<AppSettings>(() => loadAppSettings());
  const [onboarding, setOnboarding] = useState<OnboardingProfile>(() => loadOnboarding());
  const [puzzleStore, setPuzzleStore] = useState<PuzzleStoreState>(() => loadPuzzleStore());
  const [lessonProgress, setLessonProgress] = useState<Record<string, LessonProgressRecord>>(() =>
    loadLessonProgressMap()
  );
  const [customBots, setCustomBots] = useState<BotProfile[]>(() => loadCustomBots());
  const [localGames, setLocalGames] = useState<TutorGameRecord[]>(() => loadGameHistory());
  const [linkedAccounts, setLinkedAccounts] = useState<LinkedAccountInfo[]>(() => loadLinkedAccounts());
  const [importedGames, setImportedGames] = useState<StoredAccountGame[]>(() => loadImportedAccountGames());
  const [analysedMap, setAnalysedMap] = useState<Record<string, GameReviewReport>>(() => loadCachedAnalyses());
  const [gameMistakes, setGameMistakes] = useState<TutorGameMistake[]>(() => loadGameMistakes());
  const [reviewSchedule, setReviewSchedule] = useState<TutorReviewItem[]>(() =>
    loadReviewSchedule(loadGameMistakes().map(m => m.key))
  );
  const [activeGame, setActiveGame] = useState<ActiveGameSnapshot | null>(() => loadActiveGame());

  // Loaded bundled assets
  const [openingTree, setOpeningTree] = useState<OpeningTree>(() => new OpeningTree([]));
  const [puzzlePack, setPuzzlePack] = useState<PuzzlePack>(() => new PuzzlePack([]));
  const [courses, setCourses] = useState<LessonCourse[]>([]);

  useEffect(() => {
    void loadOpeningTree().then(setOpeningTree);
    void loadPuzzlePack().then(setPuzzlePack);
    void loadLessonLibrary().then(setCourses);
  }, []);

  // Resolve system/light/dark appearance and apply theme attributes to <html>
  const [systemDark, setSystemDark] = useState<boolean>(() =>
    typeof window !== "undefined" ? window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? true : true
  );

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const isDarkAppearance = settings.appearance === "dark" || (settings.appearance === "system" && systemDark);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.dataset.appTheme = settings.appTheme;
    document.documentElement.dataset.appearance = isDarkAppearance ? "dark" : "light";
  }, [settings.appTheme, isDarkAppearance]);

  const effectiveRating = useMemo(() => {
    for (const acc of linkedAccounts) {
      const r = acc.ratings.rapid ?? acc.ratings.blitz ?? acc.ratings.bullet ?? acc.ratings.classical;
      if (r && r > 0) return r;
    }
    if (onboarding.completed && onboarding.estimatedRating > 0) return onboarding.estimatedRating;
    return puzzleStore.puzzleRating || 1000;
  }, [linkedAccounts, onboarding, puzzleStore.puzzleRating]);

  const allGamesForTrain = useMemo(() => {
    const byId = new Map<string, TutorGameRecord>();
    for (const g of [...localGames, ...importedGames]) if (g.id && !byId.has(g.id)) byId.set(g.id, g);
    return [...byId.values()];
  }, [localGames, importedGames]);

  const dueMistakesCount = useMemo(() => countDueReviews(reviewSchedule), [reviewSchedule]);

  const updateSettings = (patch: Partial<AppSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      saveAppSettings(next);
      return next;
    });
  };

  const handleCompleteWelcome = (name: string, level: StartingLevelId) => {
    const ratingMap: Record<StartingLevelId, number> = { new: 500, rules: 850, player: 1200 };
    const nextOnboarding: OnboardingProfile = {
      completed: true,
      goal: level === "new" ? "openings" : "complete",
      level: level === "new" ? "new" : level === "rules" ? "casual" : "club",
      estimatedRating: ratingMap[level],
      completedAt: new Date().toISOString()
    };
    setOnboarding(nextOnboarding);
    saveOnboarding(nextOnboarding);
    if (name) updateSettings({ playerName: name });
    if (level === "new") {
      setActiveTab("learn");
      setLearnRoute({ view: "category", categoryId: "basics" });
    }
  };

  const handleSaveCustomBot = (bot: BotProfile) => {
    setCustomBots(prev => {
      const next = [bot, ...prev.filter(b => b.id !== bot.id)];
      saveCustomBots(next);
      return next;
    });
  };

  const handleDeleteCustomBot = (botId: string) => {
    setCustomBots(prev => {
      const next = prev.filter(b => b.id !== botId);
      saveCustomBots(next);
      return next;
    });
  };

  const handleUpdateLessonProgress = (lessonId: string, stepIndex: number, completed: boolean) => {
    setLessonProgress(prev => {
      const prevRec = prev[lessonId];
      const nextRec: LessonProgressRecord = {
        lessonId,
        stepIndex: Math.max(prevRec?.stepIndex ?? 0, stepIndex),
        completed: Boolean(prevRec?.completed || completed),
        completedAt: completed ? prevRec?.completedAt ?? Date.now() : prevRec?.completedAt
      };
      const next = { ...prev, [lessonId]: nextRec };
      saveLessonProgressMap(next);
      return next;
    });
  };

  const handleAwardXp = (xp: number) => {
    const today = localDateKey();
    setPuzzleStore(prev => {
      const nextDays = prev.activeDays.includes(today) ? prev.activeDays : [...prev.activeDays, today];
      const next: PuzzleStoreState = { ...prev, totalXp: prev.totalXp + xp, activeDays: nextDays };
      savePuzzleStore(next);
      return next;
    });
  };

  const handleRecordPuzzleAttempt = (result: {
    puzzleId: string;
    solved: boolean;
    clean: boolean;
    revealed: boolean;
    elapsedMs: number;
    ratingAfter: number;
    xpEarned: number;
    themes: string[];
  }) => {
    const today = localDateKey();
    setPuzzleStore(prev => {
      const entry = {
        puzzleId: result.puzzleId,
        solved: result.solved,
        clean: result.clean,
        revealed: result.revealed,
        elapsedMs: result.elapsedMs,
        ratingBefore: prev.puzzleRating,
        ratingAfter: result.ratingAfter,
        xpEarned: result.xpEarned,
        finishedAt: Date.now(),
        themes: result.themes
      };
      const nextDays = result.solved
        ? prev.activeDays.includes(today)
          ? prev.activeDays
          : [...prev.activeDays, today]
        : prev.activeDays;
      const failedSet = new Set(prev.failedPuzzleIds);
      if (result.clean) failedSet.delete(result.puzzleId);
      else if (!result.solved || !result.clean) failedSet.add(result.puzzleId);

      const next: PuzzleStoreState = {
        ...prev,
        puzzleRating: result.ratingAfter,
        totalXp: prev.totalXp + result.xpEarned,
        cleanStreak: result.clean ? prev.cleanStreak + 1 : 0,
        activeDays: nextDays,
        history: [...prev.history, entry],
        failedPuzzleIds: Array.from(failedSet)
      };
      savePuzzleStore(next);
      return next;
    });
  };

  const handleFinishLevel = (level: number, solvedCount: number) => {
    setPuzzleStore(prev => {
      const existing = prev.levels[level];
      const passed = Boolean(existing?.passed || solvedCount >= PUZZLES_TO_PASS_LEVEL);
      const nextLevels = {
        ...prev.levels,
        [level]: {
          level,
          passed,
          bestScore: Math.max(existing?.bestScore ?? 0, solvedCount),
          plays: (existing?.plays ?? 0) + 1
        }
      };
      const next: PuzzleStoreState = { ...prev, levels: nextLevels };
      savePuzzleStore(next);
      return next;
    });
  };

  const handleUpdateRushBest = (variant: "3m" | "5m" | "survival", score: number) => {
    setPuzzleStore(prev => {
      const next: PuzzleStoreState = {
        ...prev,
        rushBestTimed3: variant === "3m" ? Math.max(prev.rushBestTimed3, score) : prev.rushBestTimed3,
        rushBestTimed5: variant === "5m" ? Math.max(prev.rushBestTimed5, score) : prev.rushBestTimed5,
        rushBestSurvival: variant === "survival" ? Math.max(prev.rushBestSurvival, score) : prev.rushBestSurvival
      };
      savePuzzleStore(next);
      return next;
    });
  };

  const handleSaveGame = (record: TutorGameRecord) => {
    saveGameRecord(record);
    setLocalGames(loadGameHistory());
    setActiveGame(loadActiveGame());
  };

  const handleLinkImportedAccount = (account: LinkedAccountInfo, games: StoredAccountGame[]) => {
    setLinkedAccounts(prev => {
      const next = [
        account,
        ...prev.filter(a => !(a.platform === account.platform && a.username.toLowerCase() === account.username.toLowerCase()))
      ];
      saveLinkedAccounts(next);
      return next;
    });
    setImportedGames(prev => {
      const map = new Map<string, StoredAccountGame>();
      for (const g of games) if (g.id) map.set(g.id, g);
      for (const g of prev) if (g.id && !map.has(g.id)) map.set(g.id, g);
      const merged = Array.from(map.values()).sort((a, b) => (b.playedAt ?? 0) - (a.playedAt ?? 0));
      saveImportedAccountGames(merged);
      return merged;
    });
  };

  const handleRemoveLinkedAccount = (platform: "lichess" | "chess.com", username: string) => {
    setLinkedAccounts(prev => {
      const next = prev.filter(a => !(a.platform === platform && a.username === username));
      saveLinkedAccounts(next);
      return next;
    });
    setImportedGames(prev => {
      const next = prev.filter(g => !(g.platform === platform && g.accountUsername.toLowerCase() === username.toLowerCase()));
      saveImportedAccountGames(next);
      return next;
    });
  };

  const handleSaveGameMistakes = (records: TutorGameMistake[]) => {
    saveGameMistakes(records);
    const updated = loadGameMistakes();
    setGameMistakes(updated);
    setReviewSchedule(loadReviewSchedule(updated.map(m => m.key)));
  };

  const handleReviewGameMistake = (mistakeKey: string, clean: boolean) => {
    const nextSched = applyReviewResult(reviewSchedule, mistakeKey, clean);
    setReviewSchedule(nextSched);
    saveReviewSchedule(nextSched);
  };

  const handleOpenMistakesReview = () => {
    const items: MistakeRunItem[] = [
      ...gameMistakes.slice(0, 8).map(m => ({ kind: "game-mistake" as const, mistake: m, asPuzzle: gameMistakeToPuzzle(m) })),
      ...puzzleStore.failedPuzzleIds
        .slice(0, 8)
        .map(id => puzzlePack.get(id))
        .filter((p): p is NonNullable<typeof p> => Boolean(p))
        .map(p => ({ kind: "puzzle" as const, puzzle: p }))
    ];
    if (!items.length) {
      setActiveTab("puzzles");
      setPuzzlesRoute({ view: "modes" });
      return;
    }
    setActiveTab("puzzles");
    setPuzzlesRoute({ view: "player", config: { kind: "mistakes", items, title: "Mistakes Review" } });
  };

  const handleUpdateTrainStore = (change: (prev: TrainStore) => TrainStore) => {
    setTrainStore(prev => {
      const next = change(prev);
      saveTrainStore(next);
      return next;
    });
  };

  const handleResetAllData = () => {
    clearLocalData();
    setTrainStore(loadTrainStore());
    setTrainRoute({ view: "hub" });
    setSettings(loadAppSettings());
    setOnboarding(loadOnboarding());
    setPuzzleStore(loadPuzzleStore());
    setLessonProgress(loadLessonProgressMap());
    setCustomBots(loadCustomBots());
    setLocalGames(loadGameHistory());
    setLinkedAccounts(loadLinkedAccounts());
    setImportedGames(loadImportedAccountGames());
    setAnalysedMap(loadCachedAnalyses());
    setGameMistakes(loadGameMistakes());
    setReviewSchedule(loadReviewSchedule([]));
    setActiveGame(null);
    setActiveTab("home");
    setHomeRoute({ view: "hub" });
  };

  const handleDataImported = () => {
    setTrainStore(loadTrainStore());
    setSettings(loadAppSettings());
    setOnboarding(loadOnboarding());
    setPuzzleStore(loadPuzzleStore());
    setLessonProgress(loadLessonProgressMap());
    setCustomBots(loadCustomBots());
    setLocalGames(loadGameHistory());
    setLinkedAccounts(loadLinkedAccounts());
    setImportedGames(loadImportedAccountGames());
    setAnalysedMap(loadCachedAnalyses());
    const mistakes = loadGameMistakes();
    setGameMistakes(mistakes);
    setReviewSchedule(loadReviewSchedule(mistakes.map(m => m.key)));
    setActiveGame(loadActiveGame());
  };

  // Focus mode hides bottom bar / sidebar during active board sessions
  const isBoardFocus =
    playLaunch !== null ||
    (activeTab === "learn" && learnRoute.view === "lesson") ||
    (activeTab === "train" && isTrainFocus(trainRoute)) ||
    (activeTab === "home" && homeRoute.view === "friend-game") ||
    (activeTab === "puzzles" && puzzlesRoute.view === "player") ||
    (activeTab === "account" && accountRoute.view === "review");

  const handleTabClick = (tab: MainTab) => {
    setPlayLaunch(null);
    if (tab === activeTab) {
      if (tab === "home") setHomeRoute({ view: "hub" });
      if (tab === "learn") setLearnRoute({ view: "hub" });
      if (tab === "train") setTrainRoute({ view: "hub" });
      if (tab === "puzzles") setPuzzlesRoute({ view: "home" });
      if (tab === "account") setAccountRoute({ view: "overview" });
    } else {
      setActiveTab(tab);
    }
  };

  return (
    <div className={`ct-app-shell ${isBoardFocus ? "is-focus" : ""}`}>
      {!isBoardFocus && (
        <aside className="ct-sidebar" aria-label="Primary navigation">
          <div className="ct-brand">
            <img src="/assets/mascot/pip_ready.svg" alt="" className="ct-brand-icon" />
            <div>
              <strong>Chess Tutor</strong>
              <small>Offline &amp; Stockfish 19</small>
            </div>
          </div>

          <nav className="ct-sidebar-nav">
            {NAV_ITEMS.map(item => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`ct-nav-item ${isActive ? "is-active" : ""}`}
                  onClick={() => handleTabClick(item.id)}
                >
                  <Icon size={19} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          <div className="ct-sidebar-footer">
            <div className="ct-sidebar-user">
              <strong>{settings.playerName || "Player"}</strong>
              <small className="mono-num">
                Rating {effectiveRating} · {puzzleStore.totalXp} XP
              </small>
            </div>
          </div>
        </aside>
      )}

      <main className="ct-main-area">
        {playLaunch ? (
          <PlayBoardView
            launch={playLaunch}
            settings={settings}
            openingTree={openingTree}
            onExit={() => {
              setPlayLaunch(null);
              setActiveGame(loadActiveGame());
            }}
            onSaveGame={handleSaveGame}
            onReviewGame={gameId => {
              setPlayLaunch(null);
              setActiveTab("account");
              setAccountRoute({ view: "review", gameId });
            }}
          />
        ) : activeTab === "home" ? (
          <HomeView
            route={homeRoute}
            setRoute={setHomeRoute}
            settings={settings}
            onboarding={onboarding}
            puzzleStore={puzzleStore}
            courses={courses}
            lessonProgress={lessonProgress}
            customBots={customBots}
            activeGame={activeGame}
            openingTree={openingTree}
            puzzlePack={puzzlePack}
            dueMistakesCount={dueMistakesCount}
            effectiveRating={effectiveRating}
            onCompleteWelcome={handleCompleteWelcome}
            onSaveCustomBot={handleSaveCustomBot}
            onDeleteCustomBot={handleDeleteCustomBot}
            onLaunchPlay={launch => setPlayLaunch(launch)}
            onOpenLesson={(course, lessonId) => {
              setActiveTab("learn");
              setLearnRoute({ view: "lesson", course, lessonId });
            }}
            onOpenDailyPuzzle={p => {
              setActiveTab("puzzles");
              setPuzzlesRoute({ view: "player", config: { kind: "daily", puzzles: [p], title: "Daily Puzzle" } });
            }}
            onOpenMistakesReview={handleOpenMistakesReview}
            isDark={isDarkAppearance}
            onSaveGame={handleSaveGame}
            onOpenHealthCheck={() => {
              setActiveTab("account");
              setAccountRoute({ view: "settings" });
            }}
          />
        ) : activeTab === "learn" ? (
          <LearnView
            route={learnRoute}
            setRoute={setLearnRoute}
            settings={settings}
            isDarkAppearance={isDarkAppearance}
            courses={courses}
            lessonProgress={lessonProgress}
            onUpdateLessonProgress={handleUpdateLessonProgress}
            onAwardXp={handleAwardXp}
            onOpenBattle={openingName => {
              setActiveTab("home");
              setHomeRoute({ view: "battle", presetOpeningName: openingName });
            }}
            onOpenRelatedPuzzles={(themes, title) => {
              const related = selectRelatedPuzzles(puzzlePack, themes, effectiveRating, 10);
              if (!related.length) return;
              setActiveTab("puzzles");
              setPuzzlesRoute({ view: "player", config: { kind: "theme", puzzles: related, title } });
            }}
          />
        ) : activeTab === "train" ? (
          <TrainView
            route={trainRoute}
            setRoute={setTrainRoute}
            settings={settings}
            isDark={isDarkAppearance}
            store={trainStore}
            onUpdateStore={handleUpdateTrainStore}
            effectiveRating={effectiveRating}
            games={allGamesForTrain}
            reviews={analysedMap}
            openingTree={openingTree}
            onOpenBattle={(openingName, line, side) => {
              setActiveTab("home");
              setHomeRoute({ view: "battle", presetOpeningName: openingName, presetLine: line, presetSide: side });
            }}
          />
        ) : activeTab === "puzzles" ? (
          <PuzzlesView
            route={puzzlesRoute}
            setRoute={setPuzzlesRoute}
            settings={settings}
            puzzlePack={puzzlePack}
            puzzleStore={puzzleStore}
            gameMistakes={gameMistakes}
            dueReviewCount={dueMistakesCount}
            onRecordPuzzleAttempt={handleRecordPuzzleAttempt}
            onFinishLevel={handleFinishLevel}
            onUpdateRushBest={handleUpdateRushBest}
            onReviewGameMistake={handleReviewGameMistake}
            onReportIssue={(puzzleId, fen, note) =>
              saveReportedIssue({ id: generateUuid(), puzzleId, fen, note, createdAt: Date.now() })
            }
            onOpenExplore={(fen, moves) =>
              setPlayLaunch({ mode: "explore", startFen: fen, initialLine: moves, title: "Puzzle Analysis" })
            }
          />
        ) : (
          <AccountView
            route={accountRoute}
            setRoute={setAccountRoute}
            settings={settings}
            onUpdateSettings={updateSettings}
            isDarkAppearance={isDarkAppearance}
            effectiveRating={effectiveRating}
            puzzleStore={puzzleStore}
            puzzlePack={puzzlePack}
            courses={courses}
            lessonProgress={lessonProgress}
            localGames={localGames}
            importedGames={importedGames}
            linkedAccounts={linkedAccounts}
            analysedMap={analysedMap}
            openingTree={openingTree}
            onLinkImportedAccount={handleLinkImportedAccount}
            onRemoveLinkedAccount={handleRemoveLinkedAccount}
            onCacheAnalysis={(gameId, rep) => {
              saveCachedAnalysis(gameId, rep);
              setAnalysedMap(loadCachedAnalyses());
            }}
            onSaveGameMistakes={handleSaveGameMistakes}
            onPractiseMistake={mistake => {
              setActiveTab("puzzles");
              setPuzzlesRoute({
                view: "player",
                config: {
                  kind: "mistakes",
                  items: [{ kind: "game-mistake", mistake, asPuzzle: gameMistakeToPuzzle(mistake) }],
                  title: "Key Moment Practice"
                }
              });
            }}
            onExplorePosition={(fen, moves) =>
              setPlayLaunch({ mode: "explore", startFen: fen, initialLine: moves, title: "Position Analysis" })
            }
            onTrainTheme={theme => {
              const list = selectRelatedPuzzles(puzzlePack, [theme], puzzleStore.puzzleRating, 10);
              if (!list.length) return;
              setActiveTab("puzzles");
              setPuzzlesRoute({ view: "player", config: { kind: "theme", puzzles: list, title: theme } });
            }}
            onOpenLearnCourseByName={name => {
              const q = name.toLowerCase();
              const found = courses.find(c => q.includes(c.title.toLowerCase()) || c.title.toLowerCase().includes(q));
              setActiveTab("learn");
              if (found) setLearnRoute({ view: "course", course: found });
              else setLearnRoute({ view: "category", categoryId: "openings" });
            }}
            onResetAllData={handleResetAllData}
            onDataImported={handleDataImported}
          />
        )}
      </main>

      {!isBoardFocus && (
        <nav className="ct-bottom-nav" aria-label="Bottom navigation" style={{ ["--nav-count" as string]: NAV_ITEMS.length }}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                className={`ct-bottom-btn ${isActive ? "is-active" : ""}`}
                onClick={() => handleTabClick(item.id)}
              >
                <span className="ct-bottom-pill">
                  <Icon size={22} />
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      )}
    </div>
  );
}
