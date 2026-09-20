package com.example.chess.data

/**
 * Applies Leitner-style spaced repetition to a reviewed mistake.
 *
 * Stage 0 = new, 1 = 1 day, 2 = 3 days, 3 = 7 days, 4 = mastered.
 */
class MistakeReviewService(private val dao: ChessDao) {
  suspend fun recordResult(id: Long, solved: Boolean, nowMs: Long = System.currentTimeMillis()) {
    val current = dao.getMistake(id) ?: return
    val nextStage = if (solved) {
      (current.repetitionStage + 1).coerceAtMost(4)
    } else {
      (current.repetitionStage - 1).coerceAtLeast(0)
    }

    val intervalMs = when (nextStage) {
      1 -> DAY
      2 -> 3 * DAY
      3 -> 7 * DAY
      4 -> 30 * DAY
      else -> DAY
    }

    dao.updateMistake(
      current.copy(
        repetitionStage = nextStage,
        timesReviewed = current.timesReviewed + 1,
        timesSolvedSuccessfully = current.timesSolvedSuccessfully + if (solved) 1 else 0,
        reviewDueTimestampMs = if (nextStage == 4) nowMs + 30 * DAY else nowMs + intervalMs
      )
    )
  }

  private companion object {
    const val DAY = 86_400_000L
  }
}
