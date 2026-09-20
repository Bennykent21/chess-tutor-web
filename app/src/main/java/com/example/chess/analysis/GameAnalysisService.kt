package com.example.chess.analysis

import com.example.chess.core.PieceColor
import com.example.chess.data.ChessDao
import com.example.chess.data.MistakeRecord
import com.example.chess.engine.EngineClient
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class GameAnalysisService(
  private val engine: EngineClient,
  private val dao: ChessDao
) {
  suspend fun analyzeAndPersist(
    pgn: String,
    playerColor: PieceColor,
    depth: Int = 3
  ): List<AnalyzedMove> = withContext(Dispatchers.Default) {
    val game = PgnParser.parse(pgn)
    val analyzed = mutableListOf<AnalyzedMove>()

    for ((index, parsed) in game.moves.withIndex()) {
      if (parsed.color != playerColor) continue

      val before = if (index == 0) com.example.chess.core.Position.fromFen(com.example.chess.core.Position.STARTING_FEN)
        else game.moves[index - 1].positionAfter
      val after = parsed.positionAfter

      val evalBefore = engine.evaluatePosition(before, depth)
      val evalAfter = engine.evaluatePosition(after, depth)
      val best = engine.findBestMove(before, depth)
      val classification = BlunderClassifier.classify(
        playerColor, evalBefore, evalAfter, best.uci == parsed.move.uci
      )
      val explanation = BlunderClassifier.generateExplanation(
        playerColor, parsed.move, before, after, classification, best
      )

      val result = AnalyzedMove(
        moveIndex = index,
        move = parsed.move,
        playerColor = playerColor,
        positionBefore = before,
        positionAfter = after,
        evalBefore = evalBefore,
        evalAfter = evalAfter,
        bestMove = best,
        classification = classification,
        explanation = explanation
      )
      analyzed += result

      if (classification == MoveClassification.MISTAKE || classification == MoveClassification.BLUNDER) {
        val loss = (evalBefore.scoreForSide(playerColor) - evalAfter.scoreForSide(playerColor)).coerceAtLeast(0f)
        val fenBefore = before.toFen()
        val playedMoveUci = parsed.move.uci
        val bestMoveUci = best.uci
        if (dao.findMistakeId(fenBefore, playedMoveUci, bestMoveUci) == null) {
          dao.insertMistake(
            MistakeRecord(
              fenBefore = fenBefore,
              playedMoveUci = playedMoveUci,
              bestMoveUci = bestMoveUci,
              evalDeltaPawns = loss,
              pedagogicalExplanation = explanation,
              reviewDueTimestampMs = System.currentTimeMillis()
            )
          )
        }
      }
    }
    analyzed
  }
}
