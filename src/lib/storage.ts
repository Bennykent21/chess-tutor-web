import type { CardReview, CardState, LevelProgress } from "../domain/repertoire";
import type { PositionRecord } from "../domain/trainPositions";
import type { BotProfile, ChatLevel } from "../domain/bots";
import type { LessonProgressRecord } from "../domain/lessons";
import type {
  AppearanceMode,
  AppThemeId,
  BoardColorsId,
  BoardOrientationPref,
  MascotId,
  PieceSetId
} from "../domain/theme";

export type GameSource = "arena" | "chess.com" | "lichess" | "pgn";
export type ThemePreference = AppearanceMode;
export type PieceSetStyle = PieceSetId | "staunton" | "neo" | "woodcut";
export type BoardThemeStyle = BoardColorsId | "midnight" | "green";
export type ReviewDepthId = "fast" | "normal" | "deep";
export type StartingLevelId = "new" | "rules" | "player";

export interface AppSettings {
  appTheme: AppThemeId;
  appearance: AppearanceMode;
  boardThemeId: BoardColorsId;
  pieceSetId: PieceSetId;
  mascotId: MascotId;
  boardOrientation: BoardOrientationPref;
  showCoordinates: boolean;
  showLegalDots: boolean;
  reduceMotion: boolean;
  autoQueen: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  chatLevel: ChatLevel;
  reviewDepth: ReviewDepthId;
  playerName: string;
  playerPicture: string; // "", "face:<id>", "coach:<id>"
}

export const defaultAppSettings: AppSettings = {
  appTheme: "mono",
  appearance: "system",
  boardThemeId: "mono",
  pieceSetId: "cburnett",
  mascotId: "pip",
  boardOrientation: "follow-side",
  showCoordinates: true,
  showLegalDots: true,
  reduceMotion: false,
  autoQueen: false,
  soundEnabled: true,
  hapticsEnabled: true,
  chatLevel: "some",
  reviewDepth: "normal",
  playerName: "",
  playerPicture: ""
};

export interface PuzzleHistoryEntry {
  puzzleId: string;
  solved: boolean;
  clean: boolean;
  revealed: boolean;
  elapsedMs: number;
  ratingBefore: number;
  ratingAfter: number;
  xpEarned: number;
  finishedAt: number;
  themes: string[];
}

export interface LevelProgressRecord {
  level: number;
  passed: boolean;
  bestScore: number;
  plays: number;
}

export interface PuzzleStoreState {
  puzzleRating: number;
  totalXp: number;
  cleanStreak: number;
  activeDays: string[]; // YYYY-MM-DD
  levels: Record<number, LevelProgressRecord>;
  history: PuzzleHistoryEntry[];
  rushBestTimed3: number;
  rushBestTimed5: number;
  rushBestSurvival: number;
  failedPuzzleIds: string[];
}

export const defaultPuzzleStore: PuzzleStoreState = {
  puzzleRating: 1000,
  totalXp: 0,
  cleanStreak: 0,
  activeDays: [],
  levels: {},
  history: [],
  rushBestTimed3: 0,
  rushBestTimed5: 0,
  rushBestSurvival: 0,
  failedPuzzleIds: []
};

export type TutorProgress = {
  weeklyAccuracy: number;
  reviewDue: number;
  streak: number;
  completedLessons: string[];
  solvedPositions: number;
  recordedMistakes: number;
  lastActiveDate: string | null;
  puzzleRating?: number;
  lastLessonId?: string | null;
  lessonProgress?: Record<string, { stepIndex: number; completed: boolean; bestAccuracy?: number }>;
};

export type OnboardingProfile = {
  completed: boolean;
  goal: "tactics" | "openings" | "endgames" | "complete";
  level: "new" | "casual" | "club";
  estimatedRating: number;
  completedAt?: string;
};

export type LinkedAccountInfo = {
  platform: "lichess" | "chess.com";
  username: string;
  title?: string;
  avatar?: string;
  ratings: {
    rapid?: number;
    blitz?: number;
    bullet?: number;
    classical?: number;
    puzzle?: number;
  };
  lastSyncedAt: number;
  depthSynced: number;
  totalSynced: number;
  incompleteCount: number;
};

export type TutorGameRecord = {
  id?: string;
  source?: GameSource;
  externalId?: string;
  opponent: string;
  botId?: string;
  rating: number;
  userRating?: number;
  playerColor?: "w" | "b";
  result: "W" | "L" | "D";
  termination?: string;
  timeClass?: string;
  date: string;
  playedAt?: number;
  opening: string;
  eco?: string;
  moves: number;
  pgn?: string;
  incomplete?: boolean;
  url?: string;
  accuracy?: number;
};

export type StoredAccountGame = TutorGameRecord & {
  platform: "lichess" | "chess.com";
  accountUsername: string;
  rated: boolean;
  userColor: "w" | "b";
  openingEco: string;
  openingPlayedSide: "white" | "black";
  timeControl?: string;
};

export type TutorReviewItem = {
  puzzleKey: string;
  dueAt: string;
  intervalDays: number;
  repetitions: number;
  lastResult: "correct" | "wrong" | null;
};

export type TutorAttemptRecord = {
  puzzleKey: string;
  category: string;
  correct: boolean;
  hintsUsed: number;
  createdAt: string;
};

export type TutorGameMistake = {
  key: string;
  gameId: string;
  opponent: string;
  moveNumber: number;
  san: string;
  fen: string;
  category: string;
  severity: "Inaccuracy" | "Mistake" | "Blunder";
  expected: string;
  goal: string;
  hint: string;
  success: string;
  evaluationBefore: number | null;
  evaluationAfter: number | null;
  lossCp: number;
  bestLine: string[];
  createdAt: string;
};

export interface ReportedIssue {
  id: string;
  puzzleId: string;
  fen: string;
  note: string;
  createdAt: number;
}

export interface ActiveGameSnapshot {
  botId: string;
  botName: string;
  botRating: number;
  botFace: string;
  playerColor: "w" | "b";
  fen: string;
  startFen: string;
  pgn: string;
  uciMoves: string[];
  whiteMs: number | null;
  blackMs: number | null;
  incrementMs: number;
  openingTitle?: string;
  updatedAt: number;
}

const KEYS = {
  PROGRESS: "chess-tutor.progress.v1",
  ONBOARDING: "chess-tutor.onboarding.v1",
  LINKED_ACCOUNTS: "chess-tutor.linked-accounts.v1",
  IMPORTED_GAMES: "chess-tutor.imported-games.v1",
  GAMES: "chess-tutor.games.v1",
  REVIEW: "chess-tutor.review.v1",
  ATTEMPTS: "chess-tutor.attempts.v1",
  GAME_MISTAKES: "chess-tutor.game-mistakes.v1",
  APP_SETTINGS: "chess-tutor.app-settings.v2",
  TRAIN: "chess-tutor.train.v1",
  CUSTOM_BOTS: "chess-tutor.custom-bots.v1",
  LESSON_PROGRESS: "chess-tutor.lesson-progress.v2",
  PUZZLE_STORE: "chess-tutor.puzzle-store.v2",
  GAME_ANALYSES: "chess-tutor.game-analyses.v1",
  REPORTED_ISSUES: "chess-tutor.reported-issues.v1",
  ACTIVE_GAME: "chess-tutor.active-game.v1"
} as const;

export const defaultProgress: TutorProgress = {
  weeklyAccuracy: 0,
  reviewDue: 0,
  streak: 0,
  completedLessons: [],
  solvedPositions: 0,
  recordedMistakes: 0,
  lastActiveDate: null,
  puzzleRating: 1000,
  lastLessonId: null,
  lessonProgress: {}
};

export const defaultOnboarding: OnboardingProfile = {
  completed: false,
  goal: "complete",
  level: "casual",
  estimatedRating: 1000
};

export function generateUuid(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function localDateKey(d = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function computeDayStreak(activeDays: string[], today = new Date()): number {
  const set = new Set(activeDays);
  const d = new Date(today);
  let key = localDateKey(d);
  if (!set.has(key)) {
    d.setDate(d.getDate() - 1);
    key = localDateKey(d);
  }
  let count = 0;
  while (set.has(key)) {
    count++;
    d.setDate(d.getDate() - 1);
    key = localDateKey(d);
  }
  return count;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage quota errors gracefully
  }
}

export function loadAppSettings(): AppSettings {
  const saved = readJson<Partial<AppSettings>>(KEYS.APP_SETTINGS, {});
  return { ...defaultAppSettings, ...saved };
}

export function saveAppSettings(settings: AppSettings): void {
  writeJson(KEYS.APP_SETTINGS, settings);
}

export function loadCustomBots(): BotProfile[] {
  const list = readJson<BotProfile[]>(KEYS.CUSTOM_BOTS, []);
  return Array.isArray(list) ? list : [];
}

export function saveCustomBots(bots: BotProfile[]): void {
  writeJson(KEYS.CUSTOM_BOTS, bots);
}

export function loadLessonProgressMap(): Record<string, LessonProgressRecord> {
  const map = readJson<Record<string, LessonProgressRecord>>(KEYS.LESSON_PROGRESS, {});
  return map && typeof map === "object" ? map : {};
}

export function saveLessonProgressMap(map: Record<string, LessonProgressRecord>): void {
  writeJson(KEYS.LESSON_PROGRESS, map);
}

export function loadPuzzleStore(): PuzzleStoreState {
  const saved = readJson<Partial<PuzzleStoreState>>(KEYS.PUZZLE_STORE, {});
  return {
    ...defaultPuzzleStore,
    ...saved,
    activeDays: Array.isArray(saved.activeDays) ? saved.activeDays : [],
    levels: saved.levels && typeof saved.levels === "object" ? saved.levels : {},
    history: Array.isArray(saved.history) ? saved.history : [],
    failedPuzzleIds: Array.isArray(saved.failedPuzzleIds) ? saved.failedPuzzleIds : []
  };
}

export function savePuzzleStore(store: PuzzleStoreState): void {
  writeJson(KEYS.PUZZLE_STORE, {
    ...store,
    history: store.history.slice(-500),
    failedPuzzleIds: store.failedPuzzleIds.slice(0, 150)
  });
}

export function loadCachedAnalyses(): Record<string, any> {
  const map = readJson<Record<string, any>>(KEYS.GAME_ANALYSES, {});
  return map && typeof map === "object" ? map : {};
}

export function saveCachedAnalysis(gameId: string, analysis: any): void {
  const current = loadCachedAnalyses();
  current[gameId] = analysis;
  const entries = Object.entries(current).slice(-40);
  writeJson(KEYS.GAME_ANALYSES, Object.fromEntries(entries));
}

export function loadReportedIssues(): ReportedIssue[] {
  const list = readJson<ReportedIssue[]>(KEYS.REPORTED_ISSUES, []);
  return Array.isArray(list) ? list : [];
}

export function saveReportedIssue(issue: ReportedIssue): void {
  const current = loadReportedIssues();
  writeJson(KEYS.REPORTED_ISSUES, [issue, ...current].slice(0, 100));
}

export function loadActiveGame(): ActiveGameSnapshot | null {
  return readJson<ActiveGameSnapshot | null>(KEYS.ACTIVE_GAME, null);
}

export function saveActiveGame(snapshot: ActiveGameSnapshot | null): void {
  if (typeof window === "undefined") return;
  if (!snapshot) {
    window.localStorage.removeItem(KEYS.ACTIVE_GAME);
  } else {
    writeJson(KEYS.ACTIVE_GAME, snapshot);
  }
}

/* ==========================================================================
   Legacy & Test-Compatible Helpers
   ========================================================================== */

export function mergeProgress(local: TutorProgress, other: TutorProgress): TutorProgress {
  const unionLessons = Array.from(new Set([...(local.completedLessons || []), ...(other.completedLessons || [])]));
  const solved = Math.max(local.solvedPositions, other.solvedPositions);
  const mistakes = Math.max(local.recordedMistakes, other.recordedMistakes);
  const total = solved + mistakes;
  const accuracy = total > 0 ? Math.round((solved / total) * 100) : Math.max(local.weeklyAccuracy, other.weeklyAccuracy);
  const streak = Math.max(local.streak, other.streak);
  const latestDate = !local.lastActiveDate
    ? other.lastActiveDate
    : !other.lastActiveDate
    ? local.lastActiveDate
    : local.lastActiveDate > other.lastActiveDate
    ? local.lastActiveDate
    : other.lastActiveDate;

  return {
    solvedPositions: solved,
    recordedMistakes: mistakes,
    weeklyAccuracy: accuracy,
    streak,
    completedLessons: unionLessons,
    lastActiveDate: latestDate,
    reviewDue: Math.max(local.reviewDue, other.reviewDue),
    puzzleRating: Math.max(local.puzzleRating ?? 1000, other.puzzleRating ?? 1000),
    lastLessonId: local.lastLessonId ?? other.lastLessonId ?? null,
    lessonProgress: { ...(other.lessonProgress ?? {}), ...(local.lessonProgress ?? {}) }
  };
}

export function clearLocalData() {
  if (typeof window === "undefined") return;
  try {
    Object.values(KEYS).forEach(k => window.localStorage.removeItem(k));
    window.localStorage.removeItem("chess-tutor.settings.v1");
  } catch {
    // ignore
  }
}

export function loadProgress(): TutorProgress {
  const parsed = readJson<Partial<TutorProgress>>(KEYS.PROGRESS, defaultProgress);
  return { ...defaultProgress, ...parsed };
}

export function saveProgress(progress: TutorProgress) {
  writeJson(KEYS.PROGRESS, progress);
}

export function touchActivity(progress: TutorProgress): TutorProgress {
  const today = localDateKey();
  if (progress.lastActiveDate === today) return progress;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = localDateKey(yesterday);
  return {
    ...progress,
    streak: progress.lastActiveDate === yesterdayKey ? progress.streak + 1 : 1,
    lastActiveDate: today
  };
}

export function loadOnboarding(): OnboardingProfile {
  return { ...defaultOnboarding, ...readJson<Partial<OnboardingProfile>>(KEYS.ONBOARDING, defaultOnboarding) };
}

export function saveOnboarding(profile: OnboardingProfile) {
  writeJson(KEYS.ONBOARDING, profile);
}

export function loadGameHistory(): TutorGameRecord[] {
  const parsed = readJson<TutorGameRecord[]>(KEYS.GAMES, []);
  return Array.isArray(parsed) ? parsed.slice(0, 100) : [];
}

export function saveGameRecord(record: TutorGameRecord) {
  const normalized: TutorGameRecord = {
    ...record,
    id: record.id ?? `arena:${generateUuid()}`,
    source: record.source ?? "arena",
    playedAt: record.playedAt ?? Date.now()
  };
  const current = loadGameHistory().filter(g => g.id !== normalized.id);
  writeJson(KEYS.GAMES, [normalized, ...current].slice(0, 100));
}

export function loadLinkedAccounts(): LinkedAccountInfo[] {
  const parsed = readJson<LinkedAccountInfo[]>(KEYS.LINKED_ACCOUNTS, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function saveLinkedAccounts(accounts: LinkedAccountInfo[]) {
  writeJson(KEYS.LINKED_ACCOUNTS, accounts);
}

export function loadImportedAccountGames(): StoredAccountGame[] {
  const parsed = readJson<StoredAccountGame[]>(KEYS.IMPORTED_GAMES, []);
  return Array.isArray(parsed) ? parsed : [];
}

export function saveImportedAccountGames(games: StoredAccountGame[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEYS.IMPORTED_GAMES, JSON.stringify(games.slice(0, 1000)));
  } catch {
    try {
      window.localStorage.setItem(KEYS.IMPORTED_GAMES, JSON.stringify(games.slice(0, 300)));
    } catch {
      // ignore
    }
  }
}

const REVIEW_INTERVALS = [1, 3, 7, 14, 30] as const;

export function loadReviewSchedule(puzzleKeys: string[]): TutorReviewItem[] {
  const existing = readJson<TutorReviewItem[]>(KEYS.REVIEW, []);
  const byKey = new Map(
    (Array.isArray(existing) ? existing : [])
      .filter(i => i && typeof i.puzzleKey === "string")
      .map(i => [i.puzzleKey, i])
  );
  const requested = new Set(puzzleKeys);
  const schedule = [
    ...puzzleKeys.map(
      puzzleKey =>
        byKey.get(puzzleKey) ?? {
          puzzleKey,
          dueAt: new Date().toISOString(),
          intervalDays: 1,
          repetitions: 0,
          lastResult: null
        }
    ),
    ...(Array.isArray(existing) ? existing.filter(i => i && !requested.has(i.puzzleKey)) : [])
  ];
  saveReviewSchedule(schedule);
  return schedule;
}

export function saveReviewSchedule(schedule: TutorReviewItem[]) {
  writeJson(KEYS.REVIEW, schedule);
}

export function applyReviewResult(schedule: TutorReviewItem[], puzzleKey: string, correct: boolean): TutorReviewItem[] {
  const now = new Date();
  const exists = schedule.some(i => i.puzzleKey === puzzleKey);
  const list = exists
    ? schedule
    : [...schedule, { puzzleKey, dueAt: now.toISOString(), intervalDays: 1, repetitions: 0, lastResult: null }];
  return list.map(item => {
    if (item.puzzleKey !== puzzleKey) return item;
    const nextRepetitions = correct ? item.repetitions + 1 : 0;
    const intervalIndex = Math.min(nextRepetitions, REVIEW_INTERVALS.length) - 1;
    const intervalDays = correct && intervalIndex >= 0 ? REVIEW_INTERVALS[intervalIndex] : 1;
    const dueAt = new Date(now);
    dueAt.setDate(dueAt.getDate() + intervalDays);
    return {
      ...item,
      dueAt: dueAt.toISOString(),
      intervalDays,
      repetitions: nextRepetitions,
      lastResult: correct ? "correct" : "wrong"
    };
  });
}

export function countDueReviews(schedule: TutorReviewItem[], now = new Date()): number {
  return schedule.filter(item => new Date(item.dueAt).getTime() <= now.getTime()).length;
}

export function loadAttemptHistory(): TutorAttemptRecord[] {
  const parsed = readJson<TutorAttemptRecord[]>(KEYS.ATTEMPTS, []);
  return Array.isArray(parsed) ? parsed.slice(0, 150) : [];
}

export function saveAttempt(record: TutorAttemptRecord) {
  const current = loadAttemptHistory();
  writeJson(KEYS.ATTEMPTS, [record, ...current].slice(0, 150));
}

export function loadGameMistakes(): TutorGameMistake[] {
  const parsed = readJson<TutorGameMistake[]>(KEYS.GAME_MISTAKES, []);
  return Array.isArray(parsed) ? parsed.slice(0, 150) : [];
}

export function saveGameMistakes(records: TutorGameMistake[]) {
  const current = loadGameMistakes();
  const byKey = new Map(current.map(item => [item.key, item]));
  for (const r of records) byKey.set(r.key, r);
  const merged = [...byKey.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 150);
  writeJson(KEYS.GAME_MISTAKES, merged);
}

export function exportAllLocalData(): string {
  return JSON.stringify(
    {
      version: 3,
      exportedAt: new Date().toISOString(),
      appSettings: loadAppSettings(),
      onboarding: loadOnboarding(),
      customBots: loadCustomBots(),
      lessonProgress: loadLessonProgressMap(),
      puzzleStore: loadPuzzleStore(),
      reviewSchedule: loadReviewSchedule([]),
      gameMistakes: loadGameMistakes(),
      arenaGames: loadGameHistory(),
      linkedAccounts: loadLinkedAccounts(),
      importedGames: loadImportedAccountGames(),
      train: loadTrainStore(),
      gameAnalyses: loadCachedAnalyses(),
      reportedIssues: loadReportedIssues()
    },
    null,
    2
  );
}

export function importAllLocalData(jsonText: string): { ok: boolean; message: string } {
  if (typeof window === "undefined") return { ok: false, message: "Browser storage unavailable." };
  try {
    const data = JSON.parse(jsonText);
    if (!data || typeof data !== "object") return { ok: false, message: "Invalid backup JSON format." };
    if (data.appSettings) writeJson(KEYS.APP_SETTINGS, data.appSettings);
    if (data.onboarding) writeJson(KEYS.ONBOARDING, data.onboarding);
    if (Array.isArray(data.customBots)) writeJson(KEYS.CUSTOM_BOTS, data.customBots);
    if (data.lessonProgress) writeJson(KEYS.LESSON_PROGRESS, data.lessonProgress);
    if (data.puzzleStore) writeJson(KEYS.PUZZLE_STORE, data.puzzleStore);
    if (Array.isArray(data.reviewSchedule)) writeJson(KEYS.REVIEW, data.reviewSchedule);
    if (Array.isArray(data.gameMistakes)) writeJson(KEYS.GAME_MISTAKES, data.gameMistakes);
    if (Array.isArray(data.arenaGames)) writeJson(KEYS.GAMES, data.arenaGames);
    if (Array.isArray(data.linkedAccounts)) writeJson(KEYS.LINKED_ACCOUNTS, data.linkedAccounts);
    if (Array.isArray(data.importedGames)) writeJson(KEYS.IMPORTED_GAMES, data.importedGames);
    if (data.train && typeof data.train === "object") writeJson(KEYS.TRAIN, { ...defaultTrainStore, ...data.train });
    if (data.gameAnalyses) writeJson(KEYS.GAME_ANALYSES, data.gameAnalyses);
    if (Array.isArray(data.reportedIssues)) writeJson(KEYS.REPORTED_ISSUES, data.reportedIssues);
    return { ok: true, message: "Backup imported successfully." };
  } catch (err: unknown) {
    return { ok: false, message: err instanceof Error ? err.message : "Could not parse backup file." };
  }
}

/* Train: opening cards, their reviews, level unlocks and endgame/middlegame results ------------- */

export interface TrainStore {
  cards: Record<string, CardState>;
  reviews: CardReview[];
  levels: Record<string, LevelProgress>;
  positions: Record<string, PositionRecord>;
}

export const defaultTrainStore: TrainStore = { cards: {}, reviews: [], levels: {}, positions: {} };

export function loadTrainStore(): TrainStore {
  return { ...defaultTrainStore, ...readJson<Partial<TrainStore>>(KEYS.TRAIN, defaultTrainStore) };
}

export function saveTrainStore(store: TrainStore): void {
  // Keep the review log bounded: mastery reads the last 50 per level.
  writeJson(KEYS.TRAIN, { ...store, reviews: store.reviews.slice(-2000) });
}
