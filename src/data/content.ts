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
