import type { TutorProgress } from "./storage";
import { supabase } from "./supabase";

type CloudProgressRow = {
  user_id: string;
  weekly_accuracy: number;
  review_due: number;
  streak: number;
  solved_positions: number;
  recorded_mistakes: number;
  last_active_date: string | null;
};

export type AuthUser = {
  id: string;
  email: string | null;
};

export async function getAuthUser(): Promise<AuthUser | null> {
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ? { id: data.user.id, email: data.user.email ?? null } : null;
}

export function subscribeToAuthChanges(handler: (user: AuthUser | null) => void) {
  if (!supabase) return () => undefined;

  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    const user = session?.user;
    handler(user ? { id: user.id, email: user.email ?? null } : null);
  });

  return () => data.subscription.unsubscribe();
}

export async function signInWithPassword(email: string, password: string) {
  if (!supabase) return { error: new Error("Supabase is not configured.") };
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error };
}

export async function signUpWithPassword(email: string, password: string) {
  if (!supabase) return { error: new Error("Supabase is not configured.") };
  const { error } = await supabase.auth.signUp({ email, password });
  return { error };
}

export async function signOut() {
  if (!supabase) return { error: new Error("Supabase is not configured.") };
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function loadCloudProgress(userId: string): Promise<TutorProgress | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("user_progress")
    .select("user_id, weekly_accuracy, review_due, streak, solved_positions, recorded_mistakes, last_active_date")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;

  const row = data as CloudProgressRow;
  return {
    weeklyAccuracy: row.weekly_accuracy,
    reviewDue: row.review_due,
    streak: row.streak,
    solvedPositions: row.solved_positions,
    recordedMistakes: row.recorded_mistakes,
    completedLessons: [],
    lastActiveDate: row.last_active_date
  };
}

export async function saveCloudProgress(userId: string, progress: TutorProgress) {
  if (!supabase) return;

  await supabase.from("user_progress").upsert({
    user_id: userId,
    weekly_accuracy: progress.weeklyAccuracy,
    review_due: progress.reviewDue,
    streak: progress.streak,
    solved_positions: progress.solvedPositions,
    recorded_mistakes: progress.recordedMistakes,
    last_active_date: progress.lastActiveDate,
    updated_at: new Date().toISOString()
  });
}

export async function recordTrainingAttempt(args: {
  userId: string;
  lessonId?: string;
  puzzleKey: string;
  fen: string;
  expectedMove: string;
  playedMove?: string;
  correct: boolean;
  hintsUsed: number;
}) {
  if (!supabase) return;

  await supabase.from("training_attempts").insert({
    user_id: args.userId,
    lesson_id: args.lessonId ?? null,
    puzzle_key: args.puzzleKey,
    fen: args.fen,
    expected_move: args.expectedMove,
    played_move: args.playedMove ?? null,
    correct: args.correct,
    hints_used: args.hintsUsed
  });
}
