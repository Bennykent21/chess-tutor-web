package com.example.chess.ui.screens

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.aspectRatio
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.automirrored.filled.ArrowForward
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Book
import androidx.compose.material.icons.filled.Check
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Download
import androidx.compose.material.icons.filled.Lightbulb
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.Refresh
import androidx.compose.material.icons.filled.SportsEsports
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.chess.core.PieceColor
import com.example.chess.core.Position
import com.example.chess.core.Square
import com.example.chess.openings.RepertoireLine
import com.example.chess.openings.RepertoireRepository
import com.example.chess.engine.Evaluation
import com.example.chess.engine.LocalChessEngine
import com.example.chess.engine.TrainingLevel
import com.example.chess.ui.components.InteractiveChessBoard
import com.example.chess.ui.components.ChessBoardTheme
import com.example.chess.ui.theme.CanvasCardBorder
import com.example.chess.ui.theme.CoachAccentGold
import com.example.chess.ui.theme.CoachPrimary
import com.example.chess.ui.theme.LiquidGlassBorder
import com.example.chess.ui.theme.LiquidGlassSurface
import com.example.chess.ui.theme.LiquidGlassSurfaceElevated
import com.example.chess.ui.theme.StatusExcellent
import com.example.chess.ui.theme.TextBody
import com.example.chess.ui.theme.TextMuted
import com.example.chess.ui.theme.TextTitle

enum class RepertoireFilter {
  ALL,
  WHITE,
  BLACK
}

@Composable
fun RepertoireScreen(
  onPracticeLineInArena: (startingFen: String, lineTitle: String) -> Unit,
  onOpenImportModal: () -> Unit,
  onOpenStudyBoard: (lineId: String) -> Unit = {}
) {
  val repertoires by RepertoireRepository.repertoiresFlow.collectAsState()
  var activeFilter by remember { mutableStateOf(RepertoireFilter.ALL) }
  var selectedLineId by remember { mutableStateOf<String?>(null) }
  val activeLine = remember(repertoires, selectedLineId) {
    repertoires.find { it.id == selectedLineId }
  }

  // Active study step within the selected repertoire line
  var currentStepIndex by remember(activeLine) { mutableIntStateOf(0) }
  var boardThemeIndex by remember { mutableIntStateOf(0) }
  var flipped by remember(activeLine) { mutableStateOf(activeLine?.side == PieceColor.BLACK) }
  var showBestMove by remember { mutableStateOf(false) }
  var evaluation by remember { mutableStateOf<Evaluation?>(null) }
  var recommendedMove by remember { mutableStateOf<Move?>(null) }
  val engine = remember { LocalChessEngine() }

  val filteredRepertoires = remember(repertoires, activeFilter) {
    when (activeFilter) {
      RepertoireFilter.ALL -> repertoires
      RepertoireFilter.WHITE -> repertoires.filter { it.side == PieceColor.WHITE }
      RepertoireFilter.BLACK -> repertoires.filter { it.side == PieceColor.BLACK }
    }
  }

  Column(
    modifier = Modifier
      .fillMaxSize()
      .padding(horizontal = 16.dp, vertical = 8.dp)
  ) {
    if (activeLine == null) {
      // --- HEADER & FILTER LIST ---
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .padding(bottom = 12.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Column {
          Text(
            text = "REPERTOIRE VAULT",
            color = CoachAccentGold,
            fontSize = 11.sp,
            fontWeight = FontWeight.Bold,
            letterSpacing = 1.2.sp
          )
          Text(
            text = "Opening Repertoires",
            color = TextTitle,
            fontSize = 22.sp,
            fontWeight = FontWeight.ExtraBold
          )
        }

        Button(
          onClick = onOpenImportModal,
          colors = ButtonDefaults.buttonColors(
            containerColor = CoachPrimary,
            contentColor = Color(0xFF0F1115)
          ),
          shape = RoundedCornerShape(12.dp)
        ) {
          Icon(
            imageVector = Icons.Default.Download,
            contentDescription = "Import",
            modifier = Modifier.size(16.dp)
          )
          Spacer(modifier = Modifier.width(6.dp))
          Text("Import", fontSize = 12.sp, fontWeight = FontWeight.Bold)
        }
      }

      // Filter Segmented Controls
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(12.dp))
          .background(LiquidGlassSurface)
          .border(1.dp, LiquidGlassBorder, RoundedCornerShape(12.dp))
          .padding(4.dp),
        horizontalArrangement = Arrangement.spacedBy(4.dp)
      ) {
        RepertoireFilter.values().forEach { filter ->
          val isSelected = filter == activeFilter
          Box(
            modifier = Modifier
              .weight(1f)
              .clip(RoundedCornerShape(9.dp))
              .background(if (isSelected) CoachPrimary else Color.Transparent)
              .clickable { activeFilter = filter }
              .padding(vertical = 7.dp),
            contentAlignment = Alignment.Center
          ) {
            Text(
              text = when (filter) {
                RepertoireFilter.ALL -> "All Lines (${repertoires.size})"
                RepertoireFilter.WHITE -> "White (${repertoires.count { it.side == PieceColor.WHITE }})"
                RepertoireFilter.BLACK -> "Black (${repertoires.count { it.side == PieceColor.BLACK }})"
              },
              color = if (isSelected) Color(0xFF0F1115) else TextMuted,
              fontSize = 11.sp,
              fontWeight = FontWeight.Bold
            )
          }
        }
      }

      Spacer(modifier = Modifier.height(14.dp))

      // Repertoire Cards List
      LazyColumn(
        verticalArrangement = Arrangement.spacedBy(10.dp),
        modifier = Modifier.weight(1f)
      ) {
        items(filteredRepertoires, key = { it.id }) { line ->
          RepertoireLineCard(
            line = line,
            onStudyClick = {
              onOpenStudyBoard(line.id)
            },
            onSparClick = {
              val firstMoveFen = line.moves.firstOrNull()?.fenBefore ?: Position.STARTING_FEN
              onPracticeLineInArena(firstMoveFen, line.name)
            }
          )
        }
      }
    } else {
      // --- INTERACTIVE STUDY BOARD VIEW ---
      val currentStep = activeLine.moves.getOrNull(currentStepIndex)
      val currentPosition = remember(currentStep) {
        if (currentStep != null) {
          Position.fromFen(currentStep.fenAfter)
        } else {
          Position.fromFen(Position.STARTING_FEN)
        }
      }

      LaunchedEffect(currentPosition, showBestMove) {
        evaluation = null
        recommendedMove = null
        evaluation = runCatching { engine.evaluatePosition(currentPosition, depth = 3) }.getOrNull()
        if (showBestMove) {
          recommendedMove = runCatching { engine.selectMove(currentPosition, TrainingLevel.EXPERT_1800) }.getOrNull()
        }
      }

      val themes = ChessBoardTheme.values()
      val activeBoardTheme = themes[boardThemeIndex % themes.size]

      // Back navigation button
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .padding(bottom = 8.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Row(
          verticalAlignment = Alignment.CenterVertically,
          modifier = Modifier.clickable { selectedLineId = null }
        ) {
          Icon(
            imageVector = Icons.AutoMirrored.Default.ArrowBack,
            contentDescription = "Back",
            tint = CoachPrimary,
            modifier = Modifier.size(18.dp)
          )
          Spacer(modifier = Modifier.width(6.dp))
          Text(
            text = "Back to Repertoires",
            color = CoachPrimary,
            fontSize = 12.sp,
            fontWeight = FontWeight.Bold
          )
        }

        Text(
          text = "${activeLine.eco} • ${activeLine.side.name}",
          color = CoachAccentGold,
          fontSize = 11.sp,
          fontWeight = FontWeight.Bold
        )
      }

      Text(
        text = activeLine.name,
        color = TextTitle,
        fontSize = 18.sp,
        fontWeight = FontWeight.Bold,
        maxLines = 1
      )

      Spacer(modifier = Modifier.height(8.dp))

      // Interactive Chessboard displaying current ply
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Text(text = evaluation?.format() ?: "Evaluating...", color = TextBody, fontSize = 12.sp, fontWeight = FontWeight.Bold)
        Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
          OutlinedButton(onClick = { boardThemeIndex = (boardThemeIndex + 1) % themes.size }) { Text(activeBoardTheme.label, fontSize = 9.sp) }
          IconButton(onClick = { flipped = !flipped }) { Icon(Icons.Default.Refresh, contentDescription = "Flip board", tint = TextMuted) }
          IconButton(onClick = { showBestMove = !showBestMove }) { Icon(if (showBestMove) Icons.Default.Check else Icons.Default.Lightbulb, contentDescription = "Best move hint", tint = CoachAccentGold) }
        }
      }

      InteractiveChessBoard(
        position = currentPosition,
        modifier = Modifier.fillMaxWidth().padding(horizontal = 4.dp),
        flipped = flipped,
        boardTheme = activeBoardTheme,
        recommendedArrow = recommendedMove?.let { it.from to it.to }
      )

      Spacer(modifier = Modifier.height(10.dp))

      // Move Tree Scrubber & Step Navigation
      Row(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(12.dp))
          .background(LiquidGlassSurface)
          .border(1.dp, LiquidGlassBorder, RoundedCornerShape(12.dp))
          .padding(horizontal = 10.dp, vertical = 6.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        IconButton(
          onClick = {
            if (currentStepIndex > 0) currentStepIndex--
          },
          enabled = currentStepIndex > 0
        ) {
          Icon(
            imageVector = Icons.AutoMirrored.Default.ArrowBack,
            contentDescription = "Previous Move",
            tint = if (currentStepIndex > 0) CoachPrimary else TextMuted
          )
        }

        Column(horizontalAlignment = Alignment.CenterHorizontally) {
          Text(
            text = if (currentStep != null) "Move ${currentStep.moveNumber}: ${currentStep.san}" else "Starting Setup",
            color = CoachAccentGold,
            fontSize = 14.sp,
            fontWeight = FontWeight.Bold
          )
          Text(
            text = "Step ${currentStepIndex + 1} of ${activeLine.moves.size}",
            color = TextMuted,
            fontSize = 10.sp
          )
        }

        IconButton(
          onClick = {
            if (currentStepIndex < activeLine.moves.size - 1) currentStepIndex++
          },
          enabled = currentStepIndex < activeLine.moves.size - 1
        ) {
          Icon(
            imageVector = Icons.AutoMirrored.Default.ArrowForward,
            contentDescription = "Next Move",
            tint = if (currentStepIndex < activeLine.moves.size - 1) CoachPrimary else TextMuted
          )
        }
      }

      Spacer(modifier = Modifier.height(10.dp))

      // Coach Note / Commentary Deck
      Box(
        modifier = Modifier
          .fillMaxWidth()
          .clip(RoundedCornerShape(14.dp))
          .background(LiquidGlassSurfaceElevated)
          .border(1.dp, LiquidGlassBorder, RoundedCornerShape(14.dp))
          .padding(12.dp)
      ) {
        Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
          Row(
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
          ) {
            Icon(
              imageVector = Icons.Default.Lightbulb,
              contentDescription = null,
              tint = CoachAccentGold,
              modifier = Modifier.size(16.dp)
            )
            Text(
              text = "Strategic Guidance",
              color = CoachAccentGold,
              fontSize = 11.5.sp,
              fontWeight = FontWeight.Bold
            )
          }

          Text(
            text = currentStep?.comment?.takeIf { it.isNotBlank() } ?: activeLine.description,
            color = TextBody,
            fontSize = 12.sp,
            lineHeight = 16.sp
          )

          if (activeLine.keyIdeas.isNotEmpty()) {
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
              activeLine.keyIdeas.take(2).forEach { idea ->
                Box(
                  modifier = Modifier
                    .clip(RoundedCornerShape(6.dp))
                    .background(Color(0x33F59E0B))
                    .padding(horizontal = 6.dp, vertical = 2.dp)
                ) {
                  Text(text = idea, color = CoachAccentGold, fontSize = 9.sp, fontWeight = FontWeight.Bold)
                }
              }
            }
          }
        }
      }

      Spacer(modifier = Modifier.height(10.dp))

      // Bottom Action Buttons: Spar in Arena or Drill
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(10.dp)
      ) {
        OutlinedButton(
          onClick = {
            currentStepIndex = 0
            RepertoireRepository.updateMastery(activeLine.id, 5)
          },
          colors = ButtonDefaults.outlinedButtonColors(contentColor = CoachPrimary),
          shape = RoundedCornerShape(12.dp),
          modifier = Modifier.weight(1f)
        ) {
          Icon(imageVector = Icons.Default.Refresh, contentDescription = null, modifier = Modifier.size(16.dp))
          Spacer(modifier = Modifier.width(6.dp))
          Text("Reset Drill", fontSize = 12.sp, fontWeight = FontWeight.Bold)
        }

        Button(
          onClick = {
            val fenToPlay = currentStep?.fenAfter ?: activeLine.moves.firstOrNull()?.fenBefore ?: Position.STARTING_FEN
            onPracticeLineInArena(fenToPlay, "${activeLine.name} (from move ${currentStep?.moveNumber ?: 1})")
          },
          colors = ButtonDefaults.buttonColors(containerColor = CoachPrimary, contentColor = Color(0xFF0F1115)),
          shape = RoundedCornerShape(12.dp),
          modifier = Modifier.weight(1.3f)
        ) {
          Icon(imageVector = Icons.Default.SportsEsports, contentDescription = null, modifier = Modifier.size(16.dp))
          Spacer(modifier = Modifier.width(6.dp))
          Text("Spar in Arena", fontSize = 12.sp, fontWeight = FontWeight.Bold)
        }
      }
    }
  }
}

@Composable
fun RepertoireLineCard(
  line: RepertoireLine,
  onStudyClick: () -> Unit,
  onSparClick: () -> Unit
) {
  Box(
    modifier = Modifier
      .fillMaxWidth()
      .clip(RoundedCornerShape(16.dp))
      .background(LiquidGlassSurface)
      .border(1.dp, CanvasCardBorder, RoundedCornerShape(16.dp))
      .padding(14.dp)
  ) {
    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically
      ) {
        Row(
          verticalAlignment = Alignment.CenterVertically,
          horizontalArrangement = Arrangement.spacedBy(8.dp)
        ) {
          Box(
            modifier = Modifier
              .size(24.dp)
              .clip(CircleShape)
              .background(if (line.side == PieceColor.WHITE) Color.White else Color(0xFF1E293B))
              .border(1.dp, CoachAccentGold, CircleShape),
            contentAlignment = Alignment.Center
          ) {
            Text(
              text = if (line.side == PieceColor.WHITE) "W" else "B",
              color = if (line.side == PieceColor.WHITE) Color.Black else Color.White,
              fontSize = 10.sp,
              fontWeight = FontWeight.ExtraBold
            )
          }

          Column {
            Text(
              text = line.name,
              color = TextTitle,
              fontSize = 14.sp,
              fontWeight = FontWeight.Bold,
              maxLines = 1
            )
            Text(
              text = "${line.eco} • ${line.moves.size} book plies",
              color = TextMuted,
              fontSize = 10.sp
            )
          }
        }

        Box(
          modifier = Modifier
            .clip(RoundedCornerShape(6.dp))
            .background(Color(0x33F59E0B))
            .padding(horizontal = 6.dp, vertical = 2.dp)
        ) {
          Text(
            text = "${line.masteryPct}% Mastered",
            color = CoachAccentGold,
            fontSize = 9.sp,
            fontWeight = FontWeight.Bold
          )
        }
      }

      LinearProgressIndicator(
        progress = { (line.masteryPct / 100f).coerceIn(0f, 1f) },
        modifier = Modifier
          .fillMaxWidth()
          .height(4.dp)
          .clip(RoundedCornerShape(2.dp)),
        color = CoachAccentGold,
        trackColor = Color(0x334E5D6C)
      )

      Text(
        text = line.description,
        color = TextBody,
        fontSize = 11.5.sp,
        lineHeight = 15.sp,
        maxLines = 2
      )

      Row(
        modifier = Modifier.fillMaxWidth(),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
      ) {
        OutlinedButton(
          onClick = onStudyClick,
          colors = ButtonDefaults.outlinedButtonColors(contentColor = CoachPrimary),
          shape = RoundedCornerShape(10.dp),
          modifier = Modifier.weight(1f)
        ) {
          Icon(imageVector = Icons.Default.Book, contentDescription = null, modifier = Modifier.size(14.dp))
          Spacer(modifier = Modifier.width(4.dp))
          Text("Study Line", fontSize = 11.sp, fontWeight = FontWeight.Bold)
        }

        Button(
          onClick = onSparClick,
          colors = ButtonDefaults.buttonColors(containerColor = CoachPrimary, contentColor = Color(0xFF0F1115)),
          shape = RoundedCornerShape(10.dp),
          modifier = Modifier.weight(1f)
        ) {
          Icon(imageVector = Icons.Default.SportsEsports, contentDescription = null, modifier = Modifier.size(14.dp))
          Spacer(modifier = Modifier.width(4.dp))
          Text("Spar in Arena", fontSize = 11.sp, fontWeight = FontWeight.Bold)
        }
      }
    }
  }
}
