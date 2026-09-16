package com.example.chess.ui.screens

import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import com.example.chess.coaching.CurriculumLesson
import com.example.chess.data.MistakeRecord
import com.example.chess.engine.TrainingLevel

/** Compatibility overload for callers that also provide the dashboard review count. */
@Composable
fun CoachHomeScreen(
  userEstimatedRating: Int,
  userTacticsRating: Int = 1100,
  puzzlesSolvedCount: Int = 0,
  dueMistakes: List<MistakeRecord>,
  dueReviewCount: Int,
  activeLesson: CurriculumLesson,
  onStartPlacementAssessment: () -> Unit,
  onOpenTacticsDojo: () -> Unit,
  onStartSpacedReview: () -> Unit,
  onResumeLesson: (CurriculumLesson) -> Unit,
  onLaunchSparring: (TrainingLevel) -> Unit,
  modifier: Modifier = Modifier
) {
  CoachHomeScreen(
    userEstimatedRating = userEstimatedRating,
    userTacticsRating = userTacticsRating,
    puzzlesSolvedCount = puzzlesSolvedCount,
    dueMistakes = dueMistakes,
    activeLesson = activeLesson,
    onStartPlacementAssessment = onStartPlacementAssessment,
    onOpenTacticsDojo = onOpenTacticsDojo,
    onStartSpacedReview = onStartSpacedReview,
    onResumeLesson = onResumeLesson,
    onLaunchSparring = onLaunchSparring,
    modifier = modifier
  )
}
