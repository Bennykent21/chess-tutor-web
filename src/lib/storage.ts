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
  weeklyAccuracy: 82,
  reviewDue: 4,
  streak: 7,
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
    return {
      weeklyAccuracy: typeof parsed.weeklyAccuracy === "number" ? parsed.weeklyAccuracy : defaultProgress.weeklyAccuracy,
      reviewDue: typeof parsed.reviewDue === "number" ? parsed.reviewDue : defaultProgress.reviewDue,
      streak: typeof parsed.streak === "number" ? parsed.streak : defaultProgress.streak,
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
