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
  { title: "Golden Rules of Opening", subtitle: "Opening principles", category: "Openings", copy: "Control the center, develop your pieces, and make king safety part of the plan.", rank: "Novice" },
  { title: "Italian Game", subtitle: "Classical open-game development", category: "Openings", copy: "Build active piece placement around e4, Nf3, and Bc4 while keeping an eye on f7.", rank: "Novice" },
  { title: "Queen's Gambit", subtitle: "1. d4 d5 and the central tension", category: "Openings", copy: "Learn why White offers the c-pawn and how the central structure shapes the middlegame.", rank: "Apprentice" },
  { title: "Sicilian Defense", subtitle: "1. e4 c5", category: "Openings", copy: "Explore the asymmetric structure and the dynamic plans it creates for both sides.", rank: "Apprentice" },
  { title: "Ruy Lopez", subtitle: "Pressure on the e5 defender", category: "Openings", copy: "Study a classical development pattern where early piece activity leads into long-term central pressure.", rank: "Adept" },
  { title: "Defending a Pinned Knight", subtitle: "Tactical defense", category: "Tactics", copy: "Recognize when a pinned knight is under pressure and choose between removing the pin, moving the king, or changing the tactical balance.", rank: "Novice" },
  { title: "Royal Knight Fork", subtitle: "Multi-target knight tactics", category: "Tactics", copy: "Use one knight move to attack two valuable targets at once, especially when the fork comes with tempo.", rank: "Novice" },
  { title: "Discovered Attack", subtitle: "Unmasking a line piece", category: "Tactics", copy: "Learn how a moving piece can uncover a rook, bishop, or queen attack from behind it.", rank: "Apprentice" },
  { title: "Smothered Mate", subtitle: "Knight mating pattern", category: "Tactics", copy: "Spot the rare but decisive pattern where a boxed-in king is mated by a knight.", rank: "Adept" },
  { title: "Outposts & Knight Strongholds", subtitle: "Middlegame piece placement", category: "Middlegame", copy: "Find squares the opponent cannot challenge with a pawn and turn them into permanent bases for your pieces.", rank: "Apprentice" },
  { title: "Open Files & 7th Rank", subtitle: "Rook activity", category: "Middlegame", copy: "Use open files and seventh-rank penetration to create threats that are difficult to meet passively.", rank: "Apprentice" },
  { title: "Pawn Breaks & Structure", subtitle: "Transforming the position", category: "Middlegame", copy: "Time pawn breaks so they improve your pieces and expose weaknesses in the opponent's structure.", rank: "Adept" },
  { title: "King Activity", subtitle: "The king as an active piece", category: "Endgame", copy: "Activate the king early in simplified positions while respecting the tactical danger of checks and opposition.", rank: "Novice" },
  { title: "Opposition & Key Squares", subtitle: "King and pawn endings", category: "Endgame", copy: "Use opposition and key-square control to guide a king-and-pawn ending toward promotion.", rank: "Novice" },
  { title: "Lucena Bridge", subtitle: "Rook and pawn technique", category: "Endgame", copy: "Learn the building-block technique that converts many rook-and-pawn positions into a win.", rank: "Adept" },
  { title: "Philidor Defense", subtitle: "Rook endgame defense", category: "Endgame", copy: "Set up the defensive method that uses the checking distance and the rank behind the pawn.", rank: "Adept" },
  { title: "Missed Mate in 1", subtitle: "Blunder pattern", category: "Blunder Patterns", copy: "Train the habit of checking every legal move before committing to a quiet plan.", rank: "Novice" },
  { title: "Hanging Major Pieces", subtitle: "Blunder pattern", category: "Blunder Patterns", copy: "Before calculating an attack, identify loose queens, rooks, and bishops that can simply be taken.", rank: "Novice" },
  { title: "Back-Rank Checkmate & Luft", subtitle: "King safety", category: "Blunder Patterns", copy: "Recognize when a boxed-in king is vulnerable and when a simple luft move removes the danger.", rank: "Novice" },
  { title: "Overworked Defenders", subtitle: "Tactical overload", category: "Blunder Patterns", copy: "Spot defenders that are protecting too many things and look for a second target they cannot cover.", rank: "Apprentice" },
  { title: "Failing to Interpose", subtitle: "Line checks", category: "Blunder Patterns", copy: "When a line attack appears, check whether an interposing move is the simplest and most forcing defense.", rank: "Novice" }
] as const;
