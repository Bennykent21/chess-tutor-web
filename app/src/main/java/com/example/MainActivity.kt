package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import com.example.chess.core.Position
import com.example.chess.data.ChessDatabaseProvider
import com.example.chess.data.UserProgress
import com.example.chess.engine.TrainingLevel
import com.example.chess.openings.RepertoireRepository
import com.example.chess.ui.components.FenPgnImportDialog
import com.example.chess.ui.components.ImportMode
import com.example.chess.ui.components.LiquidGlassCanvas
import com.example.chess.ui.navigation.ChessAppTab
import com.example.chess.ui.navigation.ChessBottomNavigationBar
import com.example.chess.ui.screens.ArenaScreen
import com.example.chess.ui.screens.AssessmentScreen
import com.example.chess.ui.screens.CoachHomeScreen
import com.example.chess.ui.screens.CurriculumScreen
import com.example.chess.ui.screens.RepertoireScreen
import com.example.chess.ui.screens.ReviewScreen
import com.example.chess.ui.screens.StudyBoardScreen
import com.example.chess.ui.screens.TacticsDojoScreen
import com.example.chess.ui.theme.ChessTutorTheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : ComponentActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    setContent {
      ChessTutorTheme {
        ChessTutorApp()
      }
    }
  }
}

private enum class MainNavigationDestination {
  TABS,
  PLACEMENT_ASSESSMENT,
  TACTICS_DOJO
}

@androidx.compose.runtime.Composable
private fun ChessTutorApp() {
  val context = androidx.compose.ui.platform.LocalContext.current
  val database = remember { ChessDatabaseProvider.getDatabase(context) }
  val dao = database.chessDao()
  val coroutineScope = rememberCoroutineScope()
  val snackbarHostState = remember { SnackbarHostState() }

  var currentDestination by remember { mutableStateOf(MainNavigationDestination.TABS) }
  var currentTab by remember { mutableStateOf(ChessAppTab.COACH) }
  var arenaStartingFen by remember { mutableStateOf(Position.STARTING_FEN) }
  var arenaSelectedLevel by remember { mutableStateOf(TrainingLevel.INTERMEDIATE_1200) }
  var showImportModal by remember { mutableStateOf(false) }
  var studyLineId by remember { mutableStateOf<Long?>(null) }

  val userProgress by dao.observeUserProgress().collectAsStateWithLifecycle(initialValue = null)
  val dueMistakes by dao.getDueMistakes(System.currentTimeMillis()).collectAsStateWithLifecycle(initialValue = emptyList())
  val dueReviewCount by dao.observeDueMistakeCount(System.currentTimeMillis()).collectAsStateWithLifecycle(initialValue = 0)

  LaunchedEffect(Unit) {
    RepertoireRepository.initialize()
  }

  Scaffold(
    snackbarHost = { SnackbarHost(snackbarHostState) },
    bottomBar = {
      if (currentDestination == MainNavigationDestination.TABS && studyLineId == null) {
        ChessBottomNavigationBar(
          currentTab = currentTab,
          onTabSelected = { currentTab = it }
        )
      }
    }
  ) { paddingValues ->
    LiquidGlassCanvas(
      modifier = Modifier
        .fillMaxSize()
        .statusBarsPadding()
    ) {
      if (showImportModal) {
        FenPgnImportDialog(
          initialMode = ImportMode.LICHESS,
          onDismiss = { showImportModal = false },
          onPlayFenInArena = { fen, title ->
            arenaStartingFen = fen
            arenaSelectedLevel = TrainingLevel.INTERMEDIATE_1200
            currentTab = ChessAppTab.ARENA
            coroutineScope.launch {
              snackbarHostState.showSnackbar("Loaded position: $title")
            }
          },
          onImportToRepertoire = { rep ->
            currentTab = ChessAppTab.OPENINGS
            coroutineScope.launch {
              snackbarHostState.showSnackbar("Imported ${rep.name} into Repertoire Vault!")
            }
          },
          onLoadPgnForReview = { _, _ ->
            currentTab = ChessAppTab.REVIEW
            coroutineScope.launch {
              snackbarHostState.showSnackbar("Game loaded for review.")
            }
          }
        )
      }

      if (currentDestination == MainNavigationDestination.PLACEMENT_ASSESSMENT) {
        AssessmentScreen(
          onAssessmentCompleted = { calculatedRating ->
            coroutineScope.launch {
              withContext(Dispatchers.IO) {
                dao.upsertUserProgress(
                  (userProgress ?: UserProgress()).copy(estimatedRating = calculatedRating)
                )
              }
              arenaSelectedLevel = when {
                calculatedRating < 1000 -> TrainingLevel.BEGINNER_800
                calculatedRating < 1200 -> TrainingLevel.CASUAL_1000
                calculatedRating < 1400 -> TrainingLevel.INTERMEDIATE_1200
                calculatedRating < 1600 -> TrainingLevel.CLUB_1400
                calculatedRating < 1800 -> TrainingLevel.ADVANCED_1600
                else -> TrainingLevel.EXPERT_1800
              }
              currentDestination = MainNavigationDestination.TABS
              currentTab = ChessAppTab.COACH
              snackbarHostState.showSnackbar("Skill placed at $calculatedRating ELO. Training calibrated!")
            }
          },
          onCancel = {
            currentDestination = MainNavigationDestination.TABS
          }
        )
      } else if (currentDestination == MainNavigationDestination.TACTICS_DOJO) {
        TacticsDojoScreen(
          userTacticsRating = userProgress?.tacticsRating ?: 1100,
          puzzlesSolvedCount = userProgress?.puzzlesSolved ?: 0,
          onPuzzleSolved = { newRating, solvedCount ->
            coroutineScope.launch {
              withContext(Dispatchers.IO) {
                dao.upsertUserProgress(
                  (userProgress ?: UserProgress()).copy(
                    tacticsRating = newRating,
                    puzzlesSolved = solvedCount
                  )
                )
              }
            }
          },
          onPracticeInArena = { fen, title ->
            arenaStartingFen = fen
            arenaSelectedLevel = TrainingLevel.INTERMEDIATE_1200
            currentDestination = MainNavigationDestination.TABS
            currentTab = ChessAppTab.ARENA
            coroutineScope.launch {
              snackbarHostState.showSnackbar("Tactical Sparring: $title")
            }
          },
          onClose = {
            currentDestination = MainNavigationDestination.TABS
          }
        )
      } else if (studyLineId != null) {
        val studyLine = RepertoireRepository.getRepertoireById(studyLineId!!)
        if (studyLine == null) {
          studyLineId = null
        } else {
          StudyBoardScreen(
            line = studyLine,
            onBack = { studyLineId = null },
            onPracticeInArena = { fen, title ->
              arenaStartingFen = fen
              arenaSelectedLevel = TrainingLevel.INTERMEDIATE_1200
              studyLineId = null
              currentTab = ChessAppTab.ARENA
              coroutineScope.launch {
                snackbarHostState.showSnackbar("Study position loaded: $title")
              }
            }
          )
        }
      } else {
        AnimatedContent(
          targetState = currentTab,
          transitionSpec = { fadeIn() togetherWith fadeOut() },
          label = "tab_content_transition",
          modifier = Modifier.padding(paddingValues)
        ) { tab ->
          when (tab) {
            ChessAppTab.COACH -> CoachHomeScreen(
              userEstimatedRating = userProgress?.estimatedRating ?: 1100,
              userTacticsRating = userProgress?.tacticsRating ?: 1100,
              puzzlesSolvedCount = userProgress?.puzzlesSolved ?: 0,
              dueMistakes = dueMistakes,
              dueReviewCount = dueReviewCount,
              activeLesson = null,
              onStartPlacementAssessment = {
                currentDestination = MainNavigationDestination.PLACEMENT_ASSESSMENT
              },
              onOpenTacticsDojo = {
                currentDestination = MainNavigationDestination.TACTICS_DOJO
              },
              onStartSpacedReview = {
                currentTab = ChessAppTab.REVIEW
                coroutineScope.launch {
                  snackbarHostState.showSnackbar(
                    if (dueMistakes.isEmpty()) "No positions are due for review"
                    else "Loaded ${dueMistakes.size} spaced-repetition positions"
                  )
                }
              },
              onResumeLesson = {
                currentTab = ChessAppTab.LESSONS
              },
              onLaunchSparring = { level ->
                arenaSelectedLevel = level
                arenaStartingFen = Position.STARTING_FEN
                currentTab = ChessAppTab.ARENA
                coroutineScope.launch {
                  snackbarHostState.showSnackbar("Sparring loaded: ${level.title}")
                }
              }
            )

            ChessAppTab.TACTICS -> TacticsDojoScreen(
              userTacticsRating = userProgress?.tacticsRating ?: 1100,
              puzzlesSolvedCount = userProgress?.puzzlesSolved ?: 0,
              onPuzzleSolved = { newRating, solvedCount ->
                coroutineScope.launch {
                  withContext(Dispatchers.IO) {
                    dao.upsertUserProgress(
                      (userProgress ?: UserProgress()).copy(
                        tacticsRating = newRating,
                        puzzlesSolved = solvedCount
                      )
                    )
                  }
                }
              },
              onPracticeInArena = { fen, title ->
                arenaStartingFen = fen
                arenaSelectedLevel = TrainingLevel.INTERMEDIATE_1200
                currentTab = ChessAppTab.ARENA
                coroutineScope.launch {
                  snackbarHostState.showSnackbar("Tactical Sparring: $title")
                }
              },
              onClose = {
                currentTab = ChessAppTab.COACH
              }
            )

            ChessAppTab.LESSONS -> CurriculumScreen(
              onPracticePositionInArena = { fen, lessonTitle ->
                arenaStartingFen = fen
                arenaSelectedLevel = TrainingLevel.INTERMEDIATE_1200
                currentTab = ChessAppTab.ARENA
                coroutineScope.launch {
                  snackbarHostState.showSnackbar("Contextual Practice: $lessonTitle")
                }
              }
            )

            ChessAppTab.OPENINGS -> RepertoireScreen(
              onPracticeLineInArena = { fen, lineTitle ->
                arenaStartingFen = fen
                arenaSelectedLevel = TrainingLevel.INTERMEDIATE_1200
                currentTab = ChessAppTab.ARENA
                coroutineScope.launch {
                  snackbarHostState.showSnackbar("Repertoire Sparring: $lineTitle")
                }
              },
              onOpenImportModal = {
                showImportModal = true
              },
              onOpenStudyBoard = { lineId ->
                studyLineId = lineId
              }
            )

            ChessAppTab.ARENA -> ArenaScreen(
              initialFen = arenaStartingFen,
              selectedLevel = arenaSelectedLevel,
              onGameFinished = { _, _ ->
                currentTab = ChessAppTab.REVIEW
                coroutineScope.launch {
                  snackbarHostState.showSnackbar("Match completed! Debrief loaded.")
                }
              }
            )

            ChessAppTab.REVIEW -> ReviewScreen(
              onRetryPosition = { fen, targetMove ->
                arenaStartingFen = fen
                currentTab = ChessAppTab.ARENA
                coroutineScope.launch {
                  snackbarHostState.showSnackbar("Retrying position: Find ${targetMove.uci}")
                }
              },
              onPracticeInArena = { fen, title ->
                arenaStartingFen = fen
                currentTab = ChessAppTab.ARENA
                coroutineScope.launch {
                  snackbarHostState.showSnackbar("Loaded into Arena: $title")
                }
              }
            )
          }
        }
      }
    }
  }
}
