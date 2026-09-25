export type TutorProgress = {
  weeklyAccuracy: number;
  reviewDue: number;
  streak: number;
  completedLessons: string[];
  solvedPositions: number;
  recordedMistakes: number;
  lastActiveDate: string | null;
};

const STORAGE_KEY = "chess-tutor.progress.v1";

export const defaultProgress: TutorProgress = {
  weeklyAccuracy: 0,
  reviewDue: 0,
  streak: 0,
  completedLessons: [],
  solvedPositions: 0,
  recordedMistakes: 0,
  lastActiveDate: null
};

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

export function loadProgress(): TutorProgress {
  if (typeof window === "undefined") return defaultProgress;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultProgress;

    const parsed = JSON.parse(raw) as Partial<TutorProgress>;
    const legacySeed = parsed.lastActiveDate === null &&
      parsed.weeklyAccuracy === 82 &&
      parsed.reviewDue === 4 &&
      parsed.streak === 7;

    return {
      weeklyAccuracy: legacySeed ? 0 : (typeof parsed.weeklyAccuracy === "number" ? parsed.weeklyAccuracy : defaultProgress.weeklyAccuracy),
      reviewDue: legacySeed ? 0 : (typeof parsed.reviewDue === "number" ? parsed.reviewDue : defaultProgress.reviewDue),
      streak: legacySeed ? 0 : (typeof parsed.streak === "number" ? parsed.streak : defaultProgress.streak),
      completedLessons: Array.isArray(parsed.completedLessons) ? parsed.completedLessons.filter((x): x is string => typeof x === "string") : [],
      solvedPositions: typeof parsed.solvedPositions === "number" ? parsed.solvedPositions : 0,
      recordedMistakes: typeof parsed.recordedMistakes === "number" ? parsed.recordedMistakes : 0,
      lastActiveDate: typeof parsed.lastActiveDate === "string" ? parsed.lastActiveDate : null
    };
  } catch {
    return defaultProgress;
  }
}

export function saveProgress(progress: TutorProgress) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // Local persistence is an enhancement; the product should still work if storage is unavailable.
  }
}

export function touchActivity(progress: TutorProgress): TutorProgress {
  const today = todayKey();
  if (progress.lastActiveDate === today) return progress;

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayKey = yesterday.toISOString().slice(0, 10);

  return {
    ...progress,
    streak: progress.lastActiveDate === yesterdayKey ? progress.streak + 1 : Math.max(1, progress.streak),
    lastActiveDate: today
  };
}


export type TutorGameRecord = {
  opponent: string;
  rating: number;
  result: "W" | "L" | "D";
  date: string;
  opening: string;
  moves: number;
};

const GAMES_KEY = "chess-tutor.games.v1";

export function loadGameHistory(): TutorGameRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(GAMES_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(item =>
      item &&
      typeof item.opponent === "string" &&
      typeof item.rating === "number" &&
      ["W", "L", "D"].includes(item.result) &&
      typeof item.date === "string" &&
      typeof item.opening === "string" &&
      typeof item.moves === "number"
    ).slice(0, 20) as TutorGameRecord[];
  } catch {
    return [];
  }
}

export function saveGameRecord(record: TutorGameRecord) {
  if (typeof window === "undefined") return;
  try {
    const current = loadGameHistory();
    window.localStorage.setItem(GAMES_KEY, JSON.stringify([record, ...current].slice(0, 20)));
  } catch {
    // Local history is an enhancement; the game remains playable if storage is unavailable.
  }
}


export type TutorReviewItem = {
  puzzleKey: string;
  dueAt: string;
  intervalDays: number;
  repetitions: number;
  lastResult: "correct" | "wrong" | null;
};

const REVIEW_KEY = "chess-tutor.review.v1";
const REVIEW_INTERVALS = [1, 3, 7, 14, 30] as const;

export function loadReviewSchedule(puzzleKeys: string[]): TutorReviewItem[] {
  if (typeof window === "undefined") {
    return puzzleKeys.map(puzzleKey => ({
      puzzleKey,
      dueAt: new Date().toISOString(),
      intervalDays: 1,
      repetitions: 0,
      lastResult: null
    }));
  }

  try {
    const raw = window.localStorage.getItem(REVIEW_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    const existing = Array.isArray(parsed) ? parsed : [];
    const byKey = new Map<string, TutorReviewItem>(
      existing
        .filter(item =>
          item &&
          typeof item.puzzleKey === "string" &&
          typeof item.dueAt === "string" &&
          typeof item.intervalDays === "number" &&
          typeof item.repetitions === "number" &&
          (item.lastResult === null || item.lastResult === "correct" || item.lastResult === "wrong")
        )
        .map(item => [item.puzzleKey, item as TutorReviewItem])
    );

    const schedule = puzzleKeys.map(puzzleKey => byKey.get(puzzleKey) ?? ({
      puzzleKey,
      dueAt: new Date().toISOString(),
      intervalDays: 1,
      repetitions: 0,
      lastResult: null
    }));

    saveReviewSchedule(schedule);
    return schedule;
  } catch {
    return puzzleKeys.map(puzzleKey => ({
      puzzleKey,
      dueAt: new Date().toISOString(),
      intervalDays: 1,
      repetitions: 0,
      lastResult: null
    }));
  }
}

export function saveReviewSchedule(schedule: TutorReviewItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(REVIEW_KEY, JSON.stringify(schedule));
  } catch {
    // Review persistence is an enhancement; the queue still works in memory.
  }
}

export function applyReviewResult(schedule: TutorReviewItem[], puzzleKey: string, correct: boolean): TutorReviewItem[] {
  const now = new Date();
  return schedule.map(item => {
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

export function countDueReviews(schedule: TutorReviewItem[], now = new Date()) {
  return schedule.filter(item => new Date(item.dueAt).getTime() <= now.getTime()).length;
}
