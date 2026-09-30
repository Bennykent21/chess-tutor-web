import type { TutorProgress, TutorReviewItem } from "./storage";
import { supabase } from "./supabase";
import { TutorGameMistake, TutorSettings } from "./storage";

type CloudProgressRow = {
  user_id: string;
  weekly_accuracy: number;
  review_due: number;
  streak: number;
  solved_positions: number;
  recorded_mistakes: number;
  completed_lessons: string[];
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
    .select("user_id, weekly_accuracy, review_due, streak, solved_positions, recorded_mistakes, completed_lessons, last_active_date")
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
    completedLessons: Array.isArray(row.completed_lessons) ? row.completed_lessons : [],
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
    completed_lessons: progress.completedLessons,
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


export async function recordReviewAttempt(args: {
  userId: string;
  puzzleKey: string;
  correct: boolean;
  intervalDays: number;
  repetitions: number;
}) {
  if (!supabase) return;

  const now = new Date();
  const intervalDays = args.intervalDays;
  const dueAt = new Date(now);
  dueAt.setDate(dueAt.getDate() + intervalDays);

  await supabase.from("review_items").upsert({
    user_id: args.userId,
    puzzle_key: args.puzzleKey,
    due_at: dueAt.toISOString(),
    interval_days: intervalDays,
    repetitions: args.repetitions,
    last_result: args.correct ? "correct" : "wrong",
    last_attempt_at: now.toISOString()
  }, { onConflict: "user_id,puzzle_key" });
}

export async function recordGame(args: {
  userId: string;
  gameId: string;
  opponentName: string;
  opponentElo: number;
  playerColor: "white" | "black";
  result: "win" | "loss" | "draw";
  opening?: string;
  pgn: string;
}) {
  if (!supabase) return;

  await supabase.from("games").insert({
    id: args.gameId,
    user_id: args.userId,
    opponent_name: args.opponentName,
    opponent_elo: args.opponentElo,
    player_color: args.playerColor,
    result: args.result,
    opening: args.opening ?? "Local game",
    pgn: args.pgn,
    finished_at: new Date().toISOString()
  });
}


export async function loadCloudGames(userId: string): Promise<import("./storage").TutorGameRecord[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("games")
    .select("id, opponent_name, opponent_elo, result, opening, pgn, started_at, finished_at")
    .eq("user_id", userId)
    .order("started_at", { ascending: false })
    .limit(20);

  if (error || !data) return [];

  return data.map(row => ({
    id: row.id,
    opponent: row.opponent_name,
    rating: row.opponent_elo ?? 0,
    result: row.result === "win" ? "W" : row.result === "loss" ? "L" : "D",
    date: new Date(row.finished_at ?? row.started_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    }),
    opening: row.opening || "Local game",
    moves: countPgnMoves(row.pgn),
    pgn: row.pgn ?? undefined
  }));
}

function countPgnMoves(pgn: string) {
  const moveTokens = pgn
    .replace(/\[[^\]]*\]/g, "")
    .replace(/\{[^}]*\}/g, "")
    .replace(/\([^)]*\)/g, "")
    .replace(/\d+\.(\.\.)?/g, "")
    .trim()
    .split(/\s+/)
    .filter(token => token && !["1-0", "0-1", "1/2-1/2", "*"].includes(token));

  return moveTokens.length ? Math.ceil(moveTokens.length / 2) : 0;
}


export type TutorProfile = {
  username: string;
  title: string;
  rating: number;
  puzzleRating: number;
};

export async function loadCloudProfile(userId: string): Promise<TutorProfile | null> {
  if (!supabase) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("username, title, rating, puzzle_rating")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    username: data.username || "Player",
    title: data.title || "Novice",
    rating: data.rating ?? 1200,
    puzzleRating: data.puzzle_rating ?? 700
  };
}


export async function loadCloudReviewItems(userId: string): Promise<TutorReviewItem[]> {
  if (!supabase) return [];

  const { data, error } = await supabase
    .from("review_items")
    .select("puzzle_key, due_at, interval_days, repetitions, last_result")
    .eq("user_id", userId)
    .order("due_at", { ascending: true });

  if (error || !data) return [];

  return data.map(row => ({
    puzzleKey: row.puzzle_key,
    dueAt: row.due_at,
    intervalDays: row.interval_days,
    repetitions: row.repetitions,
    lastResult: row.last_result === "correct" || row.last_result === "wrong" ? row.last_result : null
  }));
}


export async function updateCloudProfile(userId: string, updates: { username: string }) {
  if (!supabase) return { error: new Error("Supabase is not configured.") };

  const username = updates.username.trim();
  if (!username) return { error: new Error("Username cannot be empty.") };

  const { error } = await supabase
    .from("profiles")
    .update({ username, updated_at: new Date().toISOString() })
    .eq("id", userId);

  return { error };
}


export async function recordGameMistake(userId: string, mistake: TutorGameMistake) {
  if (!supabase) return;
  const { error } = await supabase.from("game_mistakes").upsert({
    id: mistake.key,
    user_id: userId,
    game_id: mistake.gameId,
    opponent: mistake.opponent,
    move_number: mistake.moveNumber,
    san: mistake.san,
    fen: mistake.fen,
    category: mistake.category,
    severity: mistake.severity,
    expected: mistake.expected,
    goal: mistake.goal,
    hint: mistake.hint,
    success: mistake.success,
    evaluation_before: mistake.evaluationBefore,
    evaluation_after: mistake.evaluationAfter,
    loss_cp: mistake.lossCp,
    best_line: mistake.bestLine,
    created_at: mistake.createdAt
  });
  if (error) console.warn("Could not save game mistake", error);
}

export async function loadCloudGameMistakes(userId: string): Promise<TutorGameMistake[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("game_mistakes")
    .select("id, game_id, opponent, move_number, san, fen, category, severity, expected, goal, hint, success, evaluation_before, evaluation_after, loss_cp, best_line, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error || !data) return [];

  return data.map(row => ({
    key: row.id,
    gameId: row.game_id,
    opponent: row.opponent,
    moveNumber: row.move_number,
    san: row.san,
    fen: row.fen,
    category: row.category,
    severity: row.severity,
    expected: row.expected,
    goal: row.goal,
    hint: row.hint,
    success: row.success,
    evaluationBefore: row.evaluation_before,
    evaluationAfter: row.evaluation_after,
    lossCp: row.loss_cp,
    bestLine: Array.isArray(row.best_line) ? row.best_line : [],
    createdAt: row.created_at
  }));
}


export async function loadCloudSettings(userId: string): Promise<TutorSettings | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("user_preferences")
    .select("coach_detail, show_legal_moves, sound_cues")
    .eq("user_id", userId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    coachDetail: data.coach_detail === "concise" ? "concise" : "detailed",
    showLegalMoves: data.show_legal_moves !== false,
    soundCues: data.sound_cues !== false
  };
}

export async function saveCloudSettings(userId: string, settings: TutorSettings) {
  if (!supabase) return;
  const { error } = await supabase.from("user_preferences").upsert({
    user_id: userId,
    coach_detail: settings.coachDetail,
    show_legal_moves: settings.showLegalMoves,
    sound_cues: settings.soundCues,
    updated_at: new Date().toISOString()
  });
  if (error) console.warn("Could not save settings", error);
}
