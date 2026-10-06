export const openingCourses = [
  { name: "Italian Game", subtitle: "1. e4 e5 2. Nf3 Nc6 3. Bc4", rank: "Novice", mastery: "58 / 75", progress: 77 },
  { name: "London System", subtitle: "1. d4 d5 2. Bf4 Nf6 3. e3", rank: "Adept", mastery: "154 / 160", progress: 96 },
  { name: "Caro-Kann Defense", subtitle: "1. e4 c6 2. d4 d5", rank: "Apprentice", mastery: "101 / 110", progress: 92 },
  { name: "Sicilian Defense", subtitle: "1. e4 c5 · The dynamic asymmetric weapon", rank: "Novice", mastery: "52 / 80", progress: 65 },
  { name: "Scandinavian Defense", subtitle: "1. e4 d5 · Direct strike at e4", rank: "Starter", mastery: "34 / 60", progress: 57 }
] as const;

export const puzzleThemes = [
  { title: "Double Check", description: "Simultaneous checks from two different pieces force the king to move.", badge: "Lethal", count: 2 },
  { title: "Deflection", description: "Force an essential defensive piece off its crucial guard post.", badge: "Tactics", count: 1 },
  { title: "Discovered Attack", description: "Move one piece to unleash a devastating attack from behind it.", badge: "Ambush", count: 1 },
  { title: "Exposed King", description: "Punish a monarch stranded without pawn cover in the center.", badge: "King Hunt", count: 1 },
  { title: "Advanced Pawn", description: "Push passed pawns that tie down enemy pieces or promote.", badge: "Endgame", count: 1 },
  { title: "Back Rank Mate", description: "Deliver mate when enemy pawns trap their king.", badge: "Checkmate", count: 1 }
] as const;

export const pastGames = [
  { opponent: "Surf_Naga7", rating: 1731, result: "W", date: "Sep 18, 2026", opening: "Italian Game", moves: 38 },
  { opponent: "hiltrhiiuf", rating: 1722, result: "W", date: "Sep 17, 2026", opening: "London System", moves: 42 },
  { opponent: "MJN-GPA4", rating: 1737, result: "W", date: "Sep 17, 2026", opening: "Caro-Kann Defense", moves: 31 },
  { opponent: "Wayne (Bot)", rating: 600, result: "W", date: "Sep 16, 2026", opening: "Italian Game", moves: 24 }
] as const;

export const openingWinRates = [
  { name: "Sicilian Defense", winRate: 100, delta: "+18", games: 14 },
  { name: "London System", winRate: 68, delta: "+24", games: 28 },
  { name: "Italian Game", winRate: 62, delta: "+12", games: 35 },
  { name: "Caro-Kann Defense", winRate: 54, delta: "+4", games: 19 }
] as const;

export const ratingHistory = [1772, 1775, 1770, 1792, 1765, 1760, 1740, 1745, 1768, 1765, 1765] as const;

export const curriculumLessons = [
  {
    title: "Golden Rules of Opening",
    subtitle: "Center Control & Rapid Development",
    category: "Openings",
    copy: "Control the center, develop your pieces, and make king safety part of the plan.",
    explanation: "A second central pawn makes your position easier to develop and gives the c1 bishop a useful diagonal.",
    fen: "rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
    move: "d2d4",
    rank: "Novice"
  },
  {
    title: "Italian Game",
    subtitle: "Classical open-game development",
    category: "Openings",
    copy: "Build active piece placement around e4, Nf3, and Bc4 while keeping an eye on f7.",
    explanation: "The bishop develops to an active diagonal and immediately points at the sensitive f7 square.",
    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
    move: "f1c4",
    rank: "Novice"
  },
  {
    title: "Queen's Gambit",
    subtitle: "1. d4 d5 and central tension",
    category: "Openings",
    copy: "Learn why White offers the c-pawn and how the central structure shapes the middlegame.",
    explanation: "Solidifying the d5 pawn with e6 secures central space while preparing dark-squared piece development.",
    fen: "rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2",
    move: "e7e6",
    rank: "Apprentice"
  },
  {
    title: "Sicilian Defense",
    subtitle: "1. e4 c5 asymmetric dynamism",
    category: "Openings",
    copy: "Explore the asymmetric structure and the dynamic plans it creates for both sides.",
    explanation: "Developing the knight toward the center prepares the open Sicilian central pawn break with d4.",
    fen: "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
    move: "g1f3",
    rank: "Apprentice"
  },
  {
    title: "Ruy Lopez",
    subtitle: "Pressure on the e5 defender",
    category: "Openings",
    copy: "Study a classical development pattern where early piece activity leads into long-term central pressure.",
    explanation: "Bb5 pins pressure directly against the c6 knight that guards the vital e5 pawn.",
    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
    move: "f1b5",
    rank: "Adept"
  },
  {
    title: "Defending a Pinned Knight",
    subtitle: "Tactical defense and prophylaxis",
    category: "Tactics",
    copy: "Recognize when a pinned knight is under pressure and choose between removing the pin, moving the king, or changing the balance.",
    explanation: "Reinforcing the d4 pawn with c3 prevents black from undermining your pinned pieces.",
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 1 5",
    move: "c2c3",
    rank: "Novice"
  },
  {
    title: "Royal Knight Fork",
    subtitle: "Simultaneous multi-target strikes",
    category: "Tactics",
    copy: "Use one knight move to attack two valuable targets at once, especially when the fork comes with tempo.",
    explanation: "Nd6+ forks the king on e8 and the queen on c8, winning decisive material.",
    fen: "2q1k3/8/8/8/2N5/8/8/4K3 w - - 0 1",
    move: "c4d6",
    rank: "Novice"
  },
  {
    title: "Discovered Attack",
    subtitle: "Unmasking a line piece",
    category: "Tactics",
    copy: "Learn how a moving piece can uncover a rook, bishop, or queen attack from behind it.",
    explanation: "Trading on c3 destroys White's pawn structure while keeping black's queen centralized.",
    fen: "r1b1k2r/pp3ppp/2n1p3/3q4/1b1P4/1PN2N2/PB1Q1PPP/R3KB1R b KQkq - 2 10",
    move: "b4c3",
    rank: "Apprentice"
  },
  {
    title: "Smothered Mate",
    subtitle: "Knight mating pattern",
    category: "Tactics",
    copy: "Spot the rare but decisive pattern where a boxed-in king is mated by a knight.",
    explanation: "Nf7# checkmates the king because the black rook and pawns block every single escape square.",
    fen: "6rk/6pp/7N/8/8/8/8/4K3 w - - 0 1",
    move: "h6f7",
    rank: "Adept"
  },
  {
    title: "Outposts & Knight Strongholds",
    subtitle: "Middlegame piece placement",
    category: "Middlegame",
    copy: "Find squares the opponent cannot challenge with a pawn and turn them into permanent bases for your pieces.",
    explanation: "Nd5 anchors the knight on an unassailable outpost supported by the e4 pawn.",
    fen: "r1bqkb1r/pp3ppp/2n5/4p3/4P3/2N5/PPP2PPP/R1BQK2R w KQkq - 0 1",
    move: "c3d5",
    rank: "Apprentice"
  },
  {
    title: "Open Files & 7th Rank",
    subtitle: "Rook activity & invasion",
    category: "Middlegame",
    copy: "Use open files and seventh-rank penetration to create threats that are difficult to meet passively.",
    explanation: "Rb7 infiltrates the 7th rank, attacking the f7 and a7 pawns while tying down black's defenses.",
    fen: "2r3k1/5ppp/8/8/8/8/1R3PPP/4R1K1 w - - 0 1",
    move: "b2b7",
    rank: "Apprentice"
  },
  {
    title: "Pawn Breaks & Structure",
    subtitle: "Transforming the position",
    category: "Middlegame",
    copy: "Time pawn breaks so they improve your pieces and expose weaknesses in the opponent's structure.",
    explanation: "cxd5 opens lines in the center and forces Black's pawns into an isolated or hanging structure.",
    fen: "r1bqk2r/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQK2R w KQkq - 0 7",
    move: "c4d5",
    rank: "Adept"
  },
  {
    title: "King Activity",
    subtitle: "The king as an active piece",
    category: "Endgame",
    copy: "Activate the king early in simplified positions while respecting the tactical danger of checks and opposition.",
    explanation: "Ke4 marches the king into the active center to dominate space before the opponent's king arrives.",
    fen: "8/5p2/4pk2/8/8/4K3/5PPP/8 w - - 0 1",
    move: "e3e4",
    rank: "Novice"
  },
  {
    title: "Opposition & Key Squares",
    subtitle: "King and pawn endings",
    category: "Endgame",
    copy: "Use opposition and key-square control to guide a king-and-pawn ending toward promotion.",
    explanation: "Pushing e4 seizes the opposition and forces the enemy king to give ground.",
    fen: "8/8/3k4/8/3K4/4P3/8/8 w - - 0 1",
    move: "e3e4",
    rank: "Novice"
  },
  {
    title: "Lucena Bridge",
    subtitle: "Rook and pawn technique",
    category: "Endgame",
    copy: "Learn the building-block technique that converts many rook-and-pawn positions into a win.",
    explanation: "Rd2+ cuts the enemy king off from the passed pawn's file, setting up the winning bridge.",
    fen: "1K1k4/1P6/8/8/8/8/2R5/8 w - - 0 1",
    move: "c2d2",
    rank: "Adept"
  },
  {
    title: "Philidor Defense",
    subtitle: "Rook endgame defense",
    category: "Endgame",
    copy: "Set up the defensive method that uses checking distance and prevents pawn advances.",
    explanation: "Ke2 steps away from the checks while maintaining pressure against the enemy position.",
    fen: "4k3/R7/8/4P3/8/8/8/4K2r w - - 0 1",
    move: "e1e2",
    rank: "Adept"
  },
  {
    title: "Missed Mate in 1",
    subtitle: "Decisive tactical alertness",
    category: "Blunder Patterns",
    copy: "Train the habit of checking every legal move before committing to a quiet plan.",
    explanation: "Qg7# delivers immediate checkmate under king protection.",
    fen: "7k/5Q2/7K/8/8/8/8/8 w - - 0 1",
    move: "f7g7",
    rank: "Novice"
  },
  {
    title: "Hanging Major Pieces",
    subtitle: "Loose piece vulnerability",
    category: "Blunder Patterns",
    copy: "Before calculating an attack, identify loose queens, rooks, and bishops that can simply be taken.",
    explanation: "Rxd4 takes the completely undefended queen, winning the game outright.",
    fen: "4k3/8/8/8/3q4/8/3R4/4K3 w - - 0 1",
    move: "d2d4",
    rank: "Novice"
  },
  {
    title: "Back-Rank Checkmate & Luft",
    subtitle: "King safety & corridor mates",
    category: "Blunder Patterns",
    copy: "Recognize when a boxed-in king is vulnerable and when a simple luft move removes the danger.",
    explanation: "Re8# finishes the game because the black pawns block the king's only flight squares.",
    fen: "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1",
    move: "e1e8",
    rank: "Novice"
  },
  {
    title: "Overworked Defenders",
    subtitle: "Tactical overload",
    category: "Blunder Patterns",
    copy: "Spot defenders that are protecting too many things and look for a second target they cannot cover.",
    explanation: "Rxd8# exploits the fact that the black rook cannot protect both the back rank and its piece.",
    fen: "3r2k1/5ppp/8/8/4b3/8/3R1PPP/3R2K1 w - - 0 1",
    move: "d2d8",
    rank: "Apprentice"
  },
  {
    title: "Failing to Interpose",
    subtitle: "Line checks & tempo",
    category: "Blunder Patterns",
    copy: "When a line attack appears, check whether an interposing move is the simplest and most forcing defense.",
    explanation: "Bc4 develops with tempo against f7 before black can coordinate an attack.",
    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
    move: "f1c4",
    rank: "Novice"
  }
];

export type TrainingPuzzle = {
  title: string;
  category: string;
  fen: string;
  goal: string;
  hint: string;
  expected: string;
  success: string;
};

export const trainingPuzzles: TrainingPuzzle[] = [
  {
    title: "Forced Mate in One",
    category: "Blunder Patterns",
    fen: "7k/5Q2/7K/8/8/8/8/8 w - - 0 1",
    goal: "Find the queen move that delivers immediate checkmate.",
    hint: "Look for a queen move that checks while being protected by your king.",
    expected: "f7g7",
    success: "Checkmate! The queen seals all escape squares while your king securely guards g7."
  },
  {
    title: "Back-Rank Checkmate",
    category: "Blunder Patterns",
    fen: "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1",
    goal: "Exploit the boxed-in king trapped behind its pawns.",
    hint: "Look for a rook check along the eighth rank.",
    expected: "e1e8",
    success: "Checkmate! The black pawns block the king's only flight squares on rank 7."
  },
  {
    title: "Smothered Mate",
    category: "Tactics",
    fen: "6rk/6pp/7N/8/8/8/8/4K3 w - - 0 1",
    goal: "Spot the classic knight mating pattern against a trapped king.",
    hint: "The knight can leap over enemy pawns directly to f7.",
    expected: "h6f7",
    success: "Smothered mate! The enemy rook and pawns completely trap their own king."
  },
  {
    title: "Hanging Major Piece",
    category: "Blunder Patterns",
    fen: "4k3/8/8/8/3q4/8/3R4/4K3 w - - 0 1",
    goal: "Notice undefended pieces before launching long calculations.",
    hint: "Scan for undefended enemy pieces that can be taken right now.",
    expected: "d2d4",
    success: "Decisive win! The black queen was entirely loose on d4."
  },
  {
    title: "Pin and Win the Queen",
    category: "Tactics",
    fen: "4k3/8/8/8/4q3/8/4R3/4K3 w - - 0 1",
    goal: "Capitalize on the absolute pin along the open e-file.",
    hint: "Attack the pinned queen with a protected piece or push.",
    expected: "e2e4",
    success: "The queen is pinned to the king and captured without loss."
  },
  {
    title: "Overworked Back-Rank Defender",
    category: "Tactics",
    fen: "3r2k1/5ppp/8/8/4b3/8/3R1PPP/3R2K1 w - - 0 1",
    goal: "Punish the enemy rook that is burdened with defending too many duties.",
    hint: "Rxd8+ overloads the solitary defender on the back rank.",
    expected: "d2d8",
    success: "Checkmate! The defending rook was overwhelmed and back rank collapsed."
  },
  {
    title: "Opposition & King Drive",
    category: "Endgame",
    fen: "8/8/3k4/8/3K4/4P3/8/8 w - - 0 1",
    goal: "Use opposition and pawn tempo to force the opposing king back.",
    hint: "Pushing the pawn gives you the opposition and controls key breakthrough squares.",
    expected: "e3e4",
    success: "Opposition secured! The black king must give ground, clearing the path to queen."
  },
  {
    title: "Lucena Bridge Technique",
    category: "Endgame",
    fen: "1K1k4/1P6/8/8/8/8/2R5/8 w - - 0 1",
    goal: "Cut off the defending king and prepare the winning rook bridge.",
    hint: "Give a check on d2 to push the opposing king two files away from the pawn.",
    expected: "c2d2",
    success: "The king is cut off on the c-file, allowing your king to step out and promote."
  },
  {
    title: "Two Rooks Corridor Mate",
    category: "Blunder Patterns",
    fen: "k7/8/1K6/8/8/8/7R/6R1 w - - 0 1",
    goal: "Deliver a ladder checkmate using your doubled rooks.",
    hint: "One rook cuts the 7th rank while the other delivers the lethal check.",
    expected: "h2h8",
    success: "Checkmate! The corridor of rooks shuts down all escape paths."
  },
  {
    title: "Epaulette Checkmate",
    category: "Tactics",
    fen: "3rkr2/8/8/8/8/8/8/4Q1K1 w - - 0 1",
    goal: "Spot the royal geometry where flank pieces block king escapes.",
    hint: "The black rooks on d8 and f8 shoulder-trap the king.",
    expected: "e1e6",
    success: "Epaulette mate! The black rooks flank the king, making escape impossible."
  },
  {
    title: "Royal Knight Fork",
    category: "Tactics",
    fen: "1r1qk3/8/8/4N3/8/8/8/4K3 w - - 0 1",
    goal: "Fork two major pieces with a single knight jump.",
    hint: "Which square simultaneously threatens the queen on d8 and rook on b8?",
    expected: "e5c6",
    success: "Fork delivered! Nc6 attacks queen and rook at once, winning decisive material."
  },
  {
    title: "Queen & King Fork",
    category: "Tactics",
    fen: "2q1k3/8/8/8/2N5/8/8/4K3 w - - 0 1",
    goal: "Use knight fork checks to win the enemy queen.",
    hint: "Nd6+ checks the king on e8 while attacking the undefended queen on c8.",
    expected: "c4d6",
    success: "Check and fork! Nd6+ forces the king to move, leaving the queen to be taken."
  },
  {
    title: "Develop with Tempo (Italian Game)",
    category: "Openings",
    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
    goal: "Develop an active piece toward the opponent's weakest square.",
    hint: "Develop the bishop along the diagonal targeting f7.",
    expected: "f1c4",
    success: "Bc4 targets the vulnerable f7 pawn and prepares rapid kingside castling."
  },
  {
    title: "Strike in the Center",
    category: "Openings",
    fen: "rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
    goal: "Establish full classical pawn control over the center.",
    hint: "Advance your second central pawn to d4.",
    expected: "d2d4",
    success: "d4 grabs dominant central real estate and opens diagonals for both bishops."
  },
  {
    title: "Solidify Central Point",
    category: "Openings",
    fen: "rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2",
    goal: "Reinforce d5 in response to the Queen's Gambit tension.",
    hint: "Play e6 to anchor your central foothold.",
    expected: "e7e6",
    success: "e6 solidly maintains the d5 anchor and prepares dark-squared bishop development."
  },
  {
    title: "Defend the Pinned Knight",
    category: "Openings",
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 1 5",
    goal: "Fortify your center and prevent destabilizing enemy pawn advances.",
    hint: "c3 supports d4 breaks and creates an escape square for the light-squared bishop.",
    expected: "c2c3",
    success: "c3 gives White a rock-solid pawn framework in the Italian middlegame."
  },
  {
    title: "Discovered Central Pressure",
    category: "Middlegame",
    fen: "r1b1k2r/pp3ppp/2n1p3/3q4/1b1P4/1PN2N2/PB1Q1PPP/R3KB1R b KQkq - 2 10",
    goal: "Simplify advantage by neutralizing White's piece tension.",
    hint: "Trade the active pin piece on c3 to weaken White's pawn structure.",
    expected: "b4c3",
    success: "Bxc3 damages White's pawn structure and leaves Black with active central control."
  },
  {
    title: "Occupy the Central Outpost",
    category: "Middlegame",
    fen: "r1bqkb1r/pp3ppp/2n5/4p3/4P3/2N5/PPP2PPP/R1BQK2R w KQkq - 0 1",
    goal: "Plant your knight on an unassailable central outpost.",
    hint: "Jump the knight into d5 where it cannot be challenged by an enemy pawn.",
    expected: "c3d5",
    success: "Nd5 establishes a dominant outpost commanding both halves of the board."
  },
  {
    title: "Invasion on the Seventh Rank",
    category: "Middlegame",
    fen: "2r3k1/5ppp/8/8/8/8/1R3PPP/4R1K1 w - - 0 1",
    goal: "Infiltrate the critical seventh rank with your active rook.",
    hint: "Rook invasion on the 7th rank creates immediate double pawn threats.",
    expected: "b2b7",
    success: "Rb7 binds Black's defense, attacking f7 and a7 while cutting off the king."
  },
  {
    title: "Activate the King in the Endgame",
    category: "Endgame",
    fen: "8/5p2/4pk2/8/8/4K3/5PPP/8 w - - 0 1",
    goal: "Bring your monarch into the center before your opponent does.",
    hint: "In simplified endgames, the king is an aggressive attacking piece.",
    expected: "e3e4",
    success: "Ke4 stakes king claim to the central squares and dominates the endgame."
  },
  {
    title: "Step Away from Checks (Philidor)",
    category: "Endgame",
    fen: "4k3/R7/8/4P3/8/8/8/4K2r w - - 0 1",
    goal: "Dodge vertical checks while keeping attacking momentum alive.",
    hint: "Step the king forward towards the checking piece to reduce its checking distance.",
    expected: "e1e2",
    success: "Ke2 calmly exits the back rank check while guarding central squares."
  },
  {
    title: "Pawn Break Through the Center",
    category: "Middlegame",
    fen: "r1bqk2r/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQK2R w KQkq - 0 7",
    goal: "Initiate the central tension resolution to isolate Black's pawn.",
    hint: "cxd5 opens up lines for your pieces and dictates pawn structure.",
    expected: "c4d5",
    success: "cxd5 opens the c-file and gives White the initiative in the Queen's Gambit structure."
  },
  {
    title: "Removing the Defender",
    category: "Tactics",
    fen: "4k3/8/8/3b4/8/8/3R4/4K3 w - - 0 1",
    goal: "Remove the defending piece to win material cleanly.",
    hint: "The bishop on d5 is attacked and has no defenders.",
    expected: "d2d5",
    success: "Rxd5 eliminates the undefended bishop, securing a winning rook endgame."
  },
  {
    title: "Rook Lift to File Control",
    category: "Tactics",
    fen: "r4rk1/5ppp/8/8/8/8/5PPP/1R4K1 w - - 0 1",
    goal: "Challenge open file control with maximum tactical impact.",
    hint: "Infiltrate down to the 8th rank to pin or trade rooks.",
    expected: "b1b8",
    success: "Rb8 pins and forces rook trades, dismantling Black's defensive barrier."
  }
];

