package com.example.chess.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.itemsIndexed
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material3.Button
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.chess.core.Move
import com.example.chess.core.PieceColor
import com.example.chess.core.Position
import com.example.chess.engine.Evaluation
import com.example.chess.engine.LocalChessEngine
import com.example.chess.engine.TrainingLevel
import com.example.chess.openings.RepertoireLine
import com.example.chess.ui.components.ChessBoardTheme
import com.example.chess.ui.components.InteractiveChessBoard
import com.example.chess.ui.theme.CoachAccentGold
import com.example.chess.ui.theme.CoachPrimary
import com.example.chess.ui.theme.TextBody
import com.example.chess.ui.theme.TextMuted
import com.example.chess.ui.theme.TextTitle

@Composable
fun StudyBoardScreen(
  line: RepertoireLine,
  initialPly: Int = 0,
  onBack: () -> Unit,
  onPracticeInArena: (String, String) -> Unit
) {
  var ply by remember(line.id, initialPly) { mutableIntStateOf(initialPly.coerceIn(0, line.moves.lastIndex.coerceAtLeast(0))) }
  var flipped by remember(line.id) { mutableStateOf(line.side == PieceColor.BLACK) }
  var themeIndex by remember { mutableIntStateOf(0) }
  var showHint by remember { mutableStateOf(false) }
  var evaluation by remember { mutableStateOf<Evaluation?>(null) }
  var bestMove by remember { mutableStateOf<Move?>(null) }
  val engine = remember { LocalChessEngine() }
  val themes = ChessBoardTheme.values()
  val step = line.moves.getOrNull(ply)
  val position = remember(step) { Position.fromFen(step?.fenAfter ?: Position.STARTING_FEN) }

  LaunchedEffect(position, showHint) {
    evaluation = null
    bestMove = null
    evaluation = runCatching { engine.evaluatePosition(position, depth = 4) }.getOrNull()
    if (showHint) {
      bestMove = runCatching { engine.selectMove(position, TrainingLevel.EXPERT_1800) }.getOrNull()
    }
  }

  val explanation = step?.comment?.takeIf { it.isNotBlank() }
    ?: line.keyIdeas.getOrNull(if (line.keyIdeas.isEmpty()) 0 else ply % line.keyIdeas.size)
    ?: line.description

  Column(
    modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp, vertical = 10.dp),
    verticalArrangement = Arrangement.spacedBy(10.dp)
  ) {
    Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
      IconButton(onClick = onBack) {
        Icon(Icons.AutoMirrored.Filled.ArrowBack, contentDescription = "Back", tint = TextBody)
      }
      Column(modifier = Modifier.weight(1f)) {
        Text(line.eco + "  STUDY BOARD", color = CoachAccentGold, fontSize = 10.sp, fontWeight = FontWeight.Bold)
        Text(line.name, color = TextTitle, fontSize = 18.sp, fontWeight = FontWeight.ExtraBold)
      }
      Text(evaluation?.format() ?: "...", color = CoachPrimary, fontWeight = FontWeight.Bold)
    }

    InteractiveChessBoard(
      position = position,
      modifier = Modifier.fillMaxWidth(),
      flipped = flipped,
      boardTheme = themes[themeIndex % themes.size],
      recommendedArrow = bestMove?.let { it.from to it.to }
    )

    Row(
      modifier = Modifier.fillMaxWidth(),
      horizontalArrangement = Arrangement.SpaceBetween,
      verticalAlignment = Alignment.CenterVertically
    ) {
      OutlinedButton(onClick = { ply = (ply - 1).coerceAtLeast(0) }) {
        Icon(Icons.AutoMirrored.Filled.ArrowBack, null)
        Text(" Prev")
      }
      Text((ply + 1).toString() + "/" + line.moves.size, color = TextMuted, fontWeight = FontWeight.Bold)
      OutlinedButton(onClick = { ply = (ply + 1).coerceAtMost(line.moves.lastIndex.coerceAtLeast(0)) }) {
        Text("Next ")
        Icon(Icons.AutoMirrored.Filled.ArrowForward, null)
      }
    }

    LazyRow(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
      itemsIndexed(line.moves) { index, move ->
        OutlinedButton(onClick = { ply = index }) {
          Text(move.moveNumber.toString() + if (move.isWhiteMove) ". " else "... " + move.san, fontSize = 11.sp)
        }
      }
    }

    Column(modifier = Modifier.fillMaxWidth(), verticalArrangement = Arrangement.spacedBy(6.dp)) {
      Text("COACH", color = CoachAccentGold, fontSize = 10.sp, fontWeight = FontWeight.Bold)
      Text(explanation, color = TextBody, fontSize = 13.sp, lineHeight = 18.sp)
      Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        Button(onClick = { showHint = !showHint }) {
          Icon(Icons.Default.Lightbulb, null)
          Text(if (showHint) "Hide hint" else "Show best move")
        }
        OutlinedButton(onClick = { flipped = !flipped; themeIndex = (themeIndex + 1) % themes.size }) {
          Icon(Icons.Default.Refresh, null)
          Text(" Board")
        }
      }
      Button(
        onClick = { onPracticeInArena(step?.fenBefore ?: Position.STARTING_FEN, line.name) },
        modifier = Modifier.fillMaxWidth()
      ) {
        Text("Practice this position in Arena")
      }
    }
  }
}
