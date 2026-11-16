import { Chess, PieceSymbol } from "chess.js";
import { toUci } from "../lib/chessUtils";

export type BotStyleId = "balanced" | "attacker" | "defender" | "gambiteer" | "grinder" | "trickster";
export type ThinkSpeed = "fast" | "normal" | "slow";
export type ResignPolicy = "never" | "when-lost" | "early";
export type ChatLevel = "off" | "some" | "lots";

export type ChatEvent =
  | "greeting"
  | "bot-captures"
  | "player-captures"
  | "bot-checks"
  | "player-checks"
  | "player-blunder"
  | "takeback"
  | "bot-wins"
  | "player-wins"
  | "draw";

export const BOT_STYLES: Record<BotStyleId, { label: string; aggression: number; trades: number }> = {
  balanced: { label: "Balanced", aggression: 0, trades: 0 },
  attacker: { label: "Attacker", aggression: 0.9, trades: -0.5 },
  defender: { label: "Defender", aggression: -0.6, trades: 0.2 },
  gambiteer: { label: "Gambit lover", aggression: 0.7, trades: -0.3 },
  grinder: { label: "Endgame grinder", aggression: -0.3, trades: 0.8 },
  trickster: { label: "Trickster", aggression: 0.5, trades: -0.2 }
};

export interface BotProfile {
  id: string;
  name: string;
  rating: number;
  style: BotStyleId;
  aggression: number;
  trades: number;
  mistakeLevel: number; // 0..2
  thinkSpeed: ThinkSpeed;
  resign: ResignPolicy;
  whiteOpenings: string[];
  blackOpenings: string[];
  face: string;
  custom?: boolean;
}

export interface RosterBot {
  profile: BotProfile;
  animal: string;
  tagline: string;
}

function makeBot(
  id: string,
  name: string,
  rating: number,
  style: BotStyleId,
  animal: string,
  tagline: string,
  whiteOpenings: string[],
  blackOpenings: string[],
  resign: ResignPolicy = "when-lost"
): RosterBot {
  const s = BOT_STYLES[style];
  return {
    profile: {
      id,
      name,
      rating,
      style,
      aggression: s.aggression,
      trades: s.trades,
      mistakeLevel: 1,
      thinkSpeed: "normal",
      resign,
      whiteOpenings,
      blackOpenings,
      face: id
    },
    animal,
    tagline
  };
}

export const BOT_ROSTER: RosterBot[] = [
  makeBot("pebble", "Pebble", 250, "balanced", "snail", "I'm still learning how the pieces move. Be gentle!", ["Italian Game"], ["Italian Game", "Queen's Gambit Declined"], "never"),
  makeBot("wayne", "Wayne", 600, "balanced", "bear cub", "Hi! I play for fun. Don't mind my loose pieces.", ["Italian Game"], ["Scandinavian Defense", "Queen's Gambit Declined"]),
  makeBot("juno", "Juno", 800, "trickster", "fox", "I love a cheeky trap. Watch your f7.", ["Vienna Game"], ["Alekhine Defense", "Indian Defense: Budapest Gambit"]),
  makeBot("bramble", "Bramble", 1000, "defender", "hedgehog", "I curl up tight. Come and try to break me.", ["London System"], ["Caro-Kann Defense", "Slav Defense"]),
  makeBot("ziggy", "Ziggy", 1200, "attacker", "parrot", "Your king looks lonely. I'm coming for it!", ["King's Gambit"], ["Sicilian Defense: Dragon Variation", "King's Indian Defense"]),
  makeBot("marlo", "Marlo", 1400, "gambiteer", "raccoon", "Have a pawn, on me. It gets wild from here.", ["Italian Game: Evans Gambit", "Danish Gambit", "Sicilian Defense: Smith-Morra Gambit"], ["Latvian Gambit", "Benko Gambit"]),
  makeBot("tessa", "Tessa", 1600, "grinder", "otter", "Let's trade a few pieces. I'll squeeze you in the endgame.", ["Queen's Gambit"], ["French Defense", "Queen's Gambit Declined"]),
  makeBot("kofi", "Kofi", 1800, "attacker", "lion", "Sharp, fast and fearless. Try to keep up.", ["Ruy Lopez", "Scotch Game"], ["Sicilian Defense: Najdorf Variation", "King's Indian Defense"]),
  makeBot("ingrid", "Ingrid", 2000, "defender", "penguin", "I stay calm and wait for you to slip.", ["Catalan Opening", "English Opening"], ["Caro-Kann Defense", "Nimzo-Indian Defense"]),
  makeBot("nova", "Nova", 2200, "trickster", "cat", "You won't see my next move coming.", ["Bird Opening", "Vienna Game"], ["Pirc Defense", "Dutch Defense"]),
  makeBot("titan", "Titan", 2500, "attacker", "dragon", "Masters fear my fire. Do you?", ["Ruy Lopez", "Queen's Gambit Declined"], ["Sicilian Defense", "Grünfeld Defense"]),
  makeBot("bolt", "Bolt", 3000, "balanced", "robot", "I am Stockfish at full strength. Good luck.", [], [], "never")
];

export function closestRosterBot(rating: number): RosterBot {
  let best = BOT_ROSTER[0];
  let bestDiff = Math.abs(best.profile.rating - rating);
  for (const bot of BOT_ROSTER) {
    const d = Math.abs(bot.profile.rating - rating);
    if (d < bestDiff) {
      best = bot;
      bestDiff = d;
    }
  }
  return best;
}

const ROSTER_CHAT: Record<string, Partial<Record<ChatEvent, string[]>>> = {
  pebble: {
    greeting: ["Hi! Let's play a friendly game.", "Ooh, exciting! White or Black, I'm happy either way."],
    "bot-captures": ["Oh! I took a piece!"],
    "player-captures": ["Oops, I didn't see that one.", "Well played!"],
    "bot-checks": ["Check! Wait, is that good?"],
    "player-checks": ["Eep! My king needs to hide."],
    "player-blunder": ["Wait... can I take that?"],
    takeback: ["Sure, take your time!"],
    "bot-wins": ["Yay! Good game! Want to play again?"],
    "player-wins": ["Good game! You taught me something today."],
    draw: ["A tie! That was fun."]
  },
  wayne: {
    greeting: ["Hey friend! Ready for a fun game?", "Don't mind me, just moving pieces around."],
    "bot-captures": ["Snagged one!", "Oh nice, a freebie!"],
    "player-captures": ["Haha, left that hanging again!"],
    "bot-checks": ["Check! Watch out!"],
    "player-checks": ["Whoa, sneaky check!"],
    "player-blunder": ["Ooh, is that safe?"],
    takeback: ["Take it back, no worries!"],
    "bot-wins": ["Woohoo! Good game!"],
    "player-wins": ["Nice win! You got me good."],
    draw: ["Fair shake! Draw!"]
  },
  juno: {
    greeting: ["Watch closely—I set traps everywhere.", "Let's see if you spot my tricks!"],
    "bot-captures": ["Walked right into it!", "Snatched!"],
    "player-captures": ["Careful, that might have been bait."],
    "bot-checks": ["Check! Nowhere safe to step."],
    "player-checks": ["Clever! Didn't expect that."],
    "player-blunder": ["Aha! Just what I was hoping for."],
    takeback: ["Fine, try another path."],
    "bot-wins": ["Outfoxed! Good game."],
    "player-wins": ["You saw through every trap. Respect!"],
    draw: ["A standoff. Cleverly defended."]
  },
  bramble: {
    greeting: ["Solid posture, steady nerves. Your move.", "Try cracking my shell!"],
    "bot-captures": ["Cleanly picked off."],
    "player-captures": ["My position holds firm."],
    "bot-checks": ["Check. Keep your guard up."],
    "player-checks": ["Spines up! I'm safe."],
    "player-blunder": ["You overextended there."],
    takeback: ["Go ahead, rethink that one."],
    "bot-wins": ["Patience pays off. Good game."],
    "player-wins": ["You broke through! Well played."],
    draw: ["Not a single crack. Draw."]
  },
  ziggy: {
    greeting: ["Squawk! Attack mode engaged!", "Your king looks lonely. I'm coming for it!"],
    "bot-captures": ["Chomp! Right off the board!"],
    "player-captures": ["Danger! Danger!"],
    "bot-checks": ["Check! Nowhere to fly!"],
    "player-checks": ["Eek! Feathers everywhere!"],
    "player-blunder": ["Ooh! Pretty piece! Shiny!"],
    takeback: ["Again! Again!"],
    "bot-wins": ["Victory! Victory! Squawk!"],
    "player-wins": ["Squawk... well played, well played."],
    draw: ["Draw! Draw! Again?"]
  },
  marlo: {
    greeting: ["Care for a little gamble?", "Psst. Want a free pawn?"],
    "bot-captures": ["Collecting my winnings.", "A raccoon never leaves empty-handed."],
    "player-captures": ["Go on, take it. Interest is coming.", "Every gambit has its price."],
    "bot-checks": ["Check. The bill's due."],
    "player-checks": ["Bold move, partner."],
    "player-blunder": ["Ooh, finders keepers."],
    takeback: ["No bets taken back here... fine, just this once."],
    "bot-wins": ["The house always wins."],
    "player-wins": ["You called my bluff. Respect."],
    draw: ["We split the pot."]
  },
  tessa: {
    greeting: ["Hello. Let's take our time.", "No rush. The endgame will come."],
    "bot-captures": ["A fair trade. Fewer pieces suit me.", "Simplifying nicely."],
    "player-captures": ["Mm. I'll make it back slowly.", "Noted."],
    "bot-checks": ["Check. Steady now."],
    "player-checks": ["Calm waters. I'm fine."],
    "player-blunder": ["That pawn will matter later."],
    takeback: ["Good idea. Check the endgame first."],
    "bot-wins": ["Slow and steady. Good game."],
    "player-wins": ["You out-ground the grinder. Well played."],
    draw: ["A draw. A fair way to end a long game."]
  },
  kofi: {
    greeting: ["Let's see if you have the heart of a lion.", "Show me what you've got."],
    "bot-captures": ["Roar! Mine now.", "The lion feeds."],
    "player-captures": ["A brave strike.", "You'll pay for that."],
    "bot-checks": ["Check! Your king trembles.", "Check. The hunt is on."],
    "player-checks": ["A lion fears nothing."],
    "player-blunder": ["I smell weakness."],
    takeback: ["Hesitation? A true hunter commits."],
    "bot-wins": ["King of the board. Good game."],
    "player-wins": ["You fought like a lion today."],
    draw: ["Two lions, no winner."]
  },
  ingrid: {
    greeting: ["Good day. Let's keep it tidy.", "Hello. Stay cool."],
    "bot-captures": ["Taken. Cleanly.", "Thank you."],
    "player-captures": ["Fine. I had planned for that.", "Cold, but correct."],
    "bot-checks": ["Check. Chilly, isn't it?"],
    "player-checks": ["I'm not worried."],
    "player-blunder": ["That was a slip on the ice."],
    takeback: ["Very well. Again."],
    "bot-wins": ["A well-defended game. Thank you."],
    "player-wins": ["You cracked the ice. Well done."],
    draw: ["A cool draw."]
  },
  nova: {
    greeting: ["Mrrow. Let's play something unexpected.", "The stars say you'll be surprised today."],
    "bot-captures": ["Pounce!", "Mine. Purr."],
    "player-captures": ["Hiss. I meant to do that.", "Cats always land on their feet."],
    "bot-checks": ["Check. Did you see that coming?"],
    "player-checks": ["Curious move. Very curious."],
    "player-blunder": ["Oh, a little mouse came out to play."],
    takeback: ["Nine lives? Fine, take one."],
    "bot-wins": ["Purrfect. Good game."],
    "player-wins": ["You surprised me. That's rare."],
    draw: ["A draw. How mysterious."]
  },
  titan: {
    greeting: ["A challenger approaches. Very well.", "Few have survived my fire."],
    "bot-captures": ["Burned to ash.", "Another piece for my hoard."],
    "player-captures": ["A scratch on my scales.", "Bold. Foolish, but bold."],
    "bot-checks": ["Check. Feel the heat.", "Your king is in my shadow."],
    "player-checks": ["You dare?"],
    "player-blunder": ["A mistake. Dragons never forget."],
    takeback: ["Even legends hesitate, it seems."],
    "bot-wins": ["The dragon remains undefeated."],
    "player-wins": ["You have slain the dragon. Remarkable."],
    draw: ["A truce, then. For now."]
  },
  bolt: {
    greeting: ["Beep boop. Calculating your defeat.", "Hello, challenger. Initialising game."],
    "bot-captures": ["Material gained. Efficiency: high.", "Capture executed."],
    "player-captures": ["Unexpected. Recalculating.", "Error: piece missing."],
    "bot-checks": ["Check. Probability of escape: low."],
    "player-checks": ["King threat detected. Responding."],
    "player-blunder": ["Blunder detected. Thank you."],
    takeback: ["Undo accepted. Memory wiped."],
    "bot-wins": ["Game over. Result: as calculated."],
    "player-wins": ["Does not compute... Congratulations, challenger!"],
    draw: ["Draw. Both systems stable."]
  }
};

const GENERAL_CHAT: Record<ChatEvent, string[]> = {
  greeting: ["Good luck, have fun!"],
  "bot-captures": ["Captured."],
  "player-captures": ["Fair trade."],
  "bot-checks": ["Check!"],
  "player-checks": ["Nice check."],
  "player-blunder": ["Looks like a slip."],
  takeback: ["Sure, go ahead."],
  "bot-wins": ["Good game!"],
  "player-wins": ["Well played!"],
  draw: ["Good game, a draw."]
};

const ALWAYS_SPEAK = new Set<ChatEvent>(["greeting", "bot-wins", "player-wins", "draw"]);

export function botChatLine(
  profile: BotProfile,
  event: ChatEvent,
  level: ChatLevel
): string | null {
  if (level === "off") return null;
  if (!ALWAYS_SPEAK.has(event)) {
    const threshold = level === "lots" ? 0.8 : 0.35;
    if (Math.random() > threshold) return null;
  }
  const pool = ROSTER_CHAT[profile.id]?.[event] ?? GENERAL_CHAT[event];
  if (!pool || !pool.length) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function engineSkillForRating(rating: number, mistakeLevel = 1): {
  skillLevel: number;
  uciElo?: number;
  depth: number;
  movetimeMs: number;
  blunderChance: number;
} {
  const clamped = Math.max(250, Math.min(3000, rating));
  if (clamped >= 2800) {
    return { skillLevel: 20, depth: 15, movetimeMs: 850, blunderChance: 0 };
  }
  if (clamped >= 1320) {
    return {
      skillLevel: Math.round(((clamped - 250) / 2750) * 20),
      uciElo: clamped,
      depth: clamped >= 2000 ? 13 : 10,
      movetimeMs: clamped >= 2000 ? 600 : 400,
      blunderChance: Math.max(0, ((2000 - clamped) / 2000) * 0.14 * mistakeLevel)
    };
  }
  const skill = Math.max(0, Math.min(10, Math.round(((clamped - 250) / 1100) * 8)));
  return {
    skillLevel: skill,
    depth: clamped < 700 ? 6 : 8,
    movetimeMs: clamped < 700 ? 180 : 280,
    blunderChance: Math.max(0.05, ((1320 - clamped) / 1100) * 0.38 * mistakeLevel)
  };
}

function squareCoords(sq: string): [number, number] {
  return [sq.charCodeAt(0) - 97, Number(sq[1]) - 1];
}

function chebyshevDist(a: string, b: string): number {
  const [f1, r1] = squareCoords(a);
  const [f2, r2] = squareCoords(b);
  return Math.max(Math.abs(f1 - f2), Math.abs(r1 - r2));
}

const PIECE_CP: Record<PieceSymbol, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

function findEnemyKingSquare(chess: Chess, enemyColor: "w" | "b"): string | null {
  const board = chess.board();
  for (let r = 0; r < 8; r++) {
    for (let c = 0; c < 8; c++) {
      const piece = board[r][c];
      if (piece && piece.type === "k" && piece.color === enemyColor) {
        return piece.square;
      }
    }
  }
  return null;
}

export function botMoveAggressionScore(fen: string, uci: string): number {
  const chess = new Chess(fen);
  const verbose = chess.moves({ verbose: true });
  const move = verbose.find(m => toUci(m) === uci);
  if (!move) return 0;
  const enemyColor = chess.turn() === "w" ? "b" : "w";
  const enemyKing = findEnemyKingSquare(chess, enemyColor);
  let score = 0;
  chess.move(move);
  if (chess.inCheck()) score += 0.6;
  if (move.captured) score += 0.3;
  if (enemyKing) {
    const before = chebyshevDist(move.from, enemyKing);
    const now = chebyshevDist(move.to, enemyKing);
    if (move.piece !== "k" && now < before) score += now <= 2 ? 0.3 : 0.15;
    const [, fRank] = squareCoords(move.from);
    const [, tRank] = squareCoords(move.to);
    const [kFile] = squareCoords(enemyKing);
    const [tFile] = squareCoords(move.to);
    const forward = move.color === "w" ? tRank - fRank : fRank - tRank;
    if (move.piece === "p" && Math.abs(tFile - kFile) <= 1 && forward > 0) score += 0.2;
    if (move.piece !== "p" && forward < 0 && !move.captured) score -= 0.4;
  }
  return Math.max(-1, Math.min(1, score));
}

export function botMoveTradeScore(fen: string, uci: string): number {
  const chess = new Chess(fen);
  const move = chess.moves({ verbose: true }).find(m => toUci(m) === uci);
  if (!move || !move.captured) return 0;
  if (move.piece === "p" || move.piece === "k") return 0;
  const diff = Math.abs(PIECE_CP[move.piece] - PIECE_CP[move.captured]);
  if (diff <= 30) return move.piece === "q" ? 1 : 0.7;
  return 0;
}

export function pickBotCandidateMove(
  fen: string,
  candidates: { uci: string; scoreCp: number }[],
  profile: BotProfile
): string {
  if (candidates.length === 0) {
    const fallback = new Chess(fen).moves({ verbose: true });
    return fallback[0] ? toUci(fallback[0]) : "";
  }
  if (profile.rating >= 2800 || candidates.length === 1) {
    return candidates[0].uci;
  }

  const { skillLevel, blunderChance } = engineSkillForRating(profile.rating, profile.mistakeLevel);
  const sorted = [...candidates].sort((a, b) => b.scoreCp - a.scoreCp);

  // Intentional blunder injector for weaker bots
  if (sorted.length > 1 && Math.random() < blunderChance) {
    const tail = sorted.slice(1);
    return tail[Math.floor(Math.random() * tail.length)].uci;
  }

  const top = sorted[0].scoreCp;
  const weakness = Math.max(0, 120 - 2 * skillLevel);
  const delta = Math.min(top - sorted[sorted.length - 1].scoreCp, 100);
  const STYLE_CP = 35;

  let best = sorted[0];
  let bestVal = -Infinity;
  for (const cand of sorted) {
    const gap = top - cand.scoreCp;
    const push = (weakness * gap + delta * (Math.random() * weakness)) / 128;
    const styleLean =
      profile.aggression * botMoveAggressionScore(fen, cand.uci) +
      profile.trades * botMoveTradeScore(fen, cand.uci);
    const val = cand.scoreCp + push + styleLean * STYLE_CP;
    if (val >= bestVal) {
      bestVal = val;
      best = cand;
    }
  }
  return best.uci;
}

export function shouldBotResign(profile: BotProfile, recentBotEvalsCp: number[]): boolean {
  if (profile.rating < 600 || profile.resign === "never") return false;
  const [count, threshold] = profile.resign === "early" ? [2, -500] : [3, -900];
  if (recentBotEvalsCp.length < count) return false;
  return recentBotEvalsCp.slice(-count).every(cp => cp <= threshold);
}

export function thinkDelayMs(profile: BotProfile): number {
  const base = profile.rating <= 600 ? 480 : 620;
  const factor = profile.thinkSpeed === "fast" ? 0.5 : profile.thinkSpeed === "slow" ? 1.6 : 1;
  return Math.round(base * factor);
}
