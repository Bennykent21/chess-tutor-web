package com.example.chess.ui.components

import androidx.compose.runtime.Composable
import com.example.chess.openings.RepertoireLine
import com.example.chess.tactics.TacticalPuzzle

/** Compatibility overload for older callers that only consume the imported PGN text. */
@Composable
fun FenPgnImportDialog(
  initialMode: ImportMode = ImportMode.FEN,
  onDismiss: () -> Unit,
  onPlayFenInArena: (fen: String, title: String) -> Unit,
  onAddTacticsPuzzle: ((puzzle: TacticalPuzzle) -> Unit)? = null,
  onLoadPgnForReview: ((pgn: String) -> Unit)? = null,
  onImportToRepertoire: ((repertoire: RepertoireLine) -> Unit)? = null
) {
  com.example.chess.ui.components.FenPgnImportDialog(
    initialMode = initialMode,
    onDismiss = onDismiss,
    onPlayFenInArena = onPlayFenInArena,
    onAddTacticsPuzzle = onAddTacticsPuzzle,
    onLoadPgnForReview = onLoadPgnForReview?.let { callback -> { pgn, _ -> callback(pgn) } },
    onImportToRepertoire = onImportToRepertoire
  )
}
