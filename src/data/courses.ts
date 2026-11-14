export type BoardArrow = {
  from: string;
  to: string;
  color?: "brass" | "sage" | "coral";
};

export type CuratedPuzzle = {
  id: string;
  title: string;
  theme: string;
  category: "Basics" | "Checkmates" | "Tactics" | "Openings" | "Middlegame" | "Endgame";
  rating: number;
  fen: string;
  /** UCI moves alternating [playerMove1, opponentReply1, playerMove2, ...] */
  moves: string[];
  goal: string;
  hints: [string, string, string];
  success: string;
  acceptAnyMate?: boolean;
};

export type LessonStep =
  | {
      type: "explain";
      title: string;
      paragraphs: string[];
      fen: string;
      arrows?: BoardArrow[];
      highlightSquares?: string[];
      orientation?: "w" | "b";
    }
  | {
      type: "demo";
      title: string;
      fen: string;
      moves: string[];
      captions: string[];
      orientation?: "w" | "b";
    }
  | {
      type: "try";
      title: string;
      prompt: string;
      fen: string;
      solutions: string[];
      hints: [string, string, string];
      specificFeedback?: Record<string, string>;
      onWrongFallback: string;
      onCorrect: string;
      orientation?: "w" | "b";
    }
  | {
      type: "practice";
      title: string;
      puzzleIds: string[];
    }
  | {
      type: "recap";
      title: string;
      points: string[];
      nextTip: string;
    };

export type Lesson = {
  id: string;
  courseId: string;
  unit: string;
  title: string;
  subtitle: string;
  level: "Novice" | "Apprentice" | "Adept";
  estimatedMinutes: number;
  goal: string;
  steps: LessonStep[];
};

export type Course = {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: "Basics" | "Checkmates" | "Tactics" | "Openings" | "Middlegame" | "Endgame";
  recommendedFor: string;
};

export const curatedPuzzles: CuratedPuzzle[] = [
  // --- CHECKMATES ---
  {
    id: "pz-mate1-qg7",
    title: "Queen & King Mate",
    theme: "Mate in 1",
    category: "Checkmates",
    rating: 600,
    fen: "7k/5Q2/7K/8/8/8/8/8 w - - 0 1",
    moves: ["f7g7"],
    goal: "Deliver checkmate in one move with your queen protected by the king.",
    hints: [
      "Your king on h6 guards the g7 square.",
      "Move your queen directly in front of the black king.",
      "Play the queen from f7 to g7."
    ],
    success: "Qg7# is checkmate: your king protects the queen and seals every flight square.",
    acceptAnyMate: true
  },
  {
    id: "pz-backrank-re8",
    title: "Back-Rank Corridor",
    theme: "Back-Rank Mate",
    category: "Checkmates",
    rating: 700,
    fen: "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1",
    moves: ["e1e8"],
    goal: "Exploit the black king trapped behind its own f7, g7, and h7 pawns.",
    hints: [
      "Look at Black's 8th rank—there is no luft (escape square) for the king.",
      "Use your heavy piece on the open e-file.",
      "Move the rook from e1 to e8."
    ],
    success: "Re8# delivers back-rank checkmate because Black's own pawns block the 7th rank.",
    acceptAnyMate: true
  },
  {
    id: "pz-smothered-nf7",
    title: "Classic Smothered Mate",
    theme: "Smothered Mate",
    category: "Checkmates",
    rating: 950,
    fen: "6rk/6pp/7N/8/8/8/8/4K3 w - - 0 1",
    moves: ["h6f7"],
    goal: "Checkmate the cornered king whose own pieces block every flight square.",
    hints: [
      "Only a knight can attack without opening a flight square.",
      "Knights jump over blockers directly onto f7.",
      "Jump the knight from h6 to f7."
    ],
    success: "Nf7# is smothered mate! The rook on g8 and pawns on g7/h7 trap their own king.",
    acceptAnyMate: true
  },
  {
    id: "pz-ladder-rh8",
    title: "Two-Rook Ladder",
    theme: "Ladder Mate",
    category: "Checkmates",
    rating: 650,
    fen: "k7/8/1K6/8/8/8/7R/6R1 w - - 0 1",
    moves: ["h2h8"],
    goal: "Deliver checkmate along the 8th rank.",
    hints: [
      "Your king on b6 already controls a7 and b7.",
      "Give check along the 8th rank with your rook.",
      "Slide the rook from h2 to h8."
    ],
    success: "Rh8# completes the checkmate because the White king seals a7 and b7.",
    acceptAnyMate: true
  },
  {
    id: "pz-epaulette-qe6",
    title: "Epaulette Mate",
    theme: "Checkmate Pattern",
    category: "Checkmates",
    rating: 900,
    fen: "3rkr2/8/8/8/8/8/8/4Q1K1 w - - 0 1",
    moves: ["e1e6"],
    goal: "Use the enemy rooks flanking their king as blockers to deliver mate.",
    hints: [
      "The rooks on d8 and f8 block the king's lateral escapes.",
      "Place your queen along the e-file so it also takes away d7 and f7.",
      "Move your queen from e1 to e6."
    ],
    success: "Qe6# is an Epaulette Mate—the king's own rooks trap it on the back rank.",
    acceptAnyMate: true
  },
  {
    id: "pz-arabian-rh7",
    title: "Arabian Mate",
    theme: "Arabian Mate",
    category: "Checkmates",
    rating: 1100,
    fen: "7k/8/5N2/8/8/8/7R/4K3 w - - 0 1",
    moves: ["h2h7"],
    goal: "Combine rook and knight to checkmate the cornered king.",
    hints: [
      "Your knight on f6 already covers g8 and defends h7.",
      "Check the king directly adjacent with your rook.",
      "Move the rook from h2 to h7."
    ],
    success: "Rh7# is the classic Arabian Mate: the knight guards the rook and seals g8.",
    acceptAnyMate: true
  },
  {
    id: "pz-overload-rxd8",
    title: "Overloaded Back-Rank Rook",
    theme: "Overload",
    category: "Checkmates",
    rating: 980,
    fen: "3r2k1/5ppp/8/8/4b3/8/3R1PPP/3R2K1 w - - 0 1",
    moves: ["d2d8"],
    goal: "Exploit the black rook guarding the 8th rank with two attackers.",
    hints: [
      "You have two rooks doubled on the d-file against one defender.",
      "Force your way onto d8 immediately.",
      "Play Rxd8# with the d2 rook."
    ],
    success: "Rxd8# wins immediately because Black's back rank had only one defender.",
    acceptAnyMate: true
  },

  // --- BASICS ---
  {
    id: "pz-hanging-rxd4",
    title: "Capture the Loose Queen",
    theme: "Hanging Pieces",
    category: "Basics",
    rating: 600,
    fen: "4k3/8/8/8/3q4/8/3R4/4K3 w - - 0 1",
    moves: ["d2d4"],
    goal: "Always check for undefended enemy pieces before making quiet moves.",
    hints: [
      "Look along the open d-file.",
      "Black's queen on d4 has zero defenders.",
      "Capture on d4 with your rook."
    ],
    success: "Rxd4 wins an undefended queen outright!"
  },
  {
    id: "pz-remove-defender-rxd5",
    title: "Clean Capture",
    theme: "Hanging Pieces",
    category: "Basics",
    rating: 650,
    fen: "4k3/8/8/3b4/8/8/3R4/4K3 w - - 0 1",
    moves: ["d2d5"],
    goal: "Win material immediately by capturing an unprotected minor piece.",
    hints: [
      "Scan the d-file for loose pieces.",
      "The bishop on d5 has no pawn or piece guarding it.",
      "Move the rook from d2 to d5."
    ],
    success: "Rxd5 picks up a free bishop and gives White a winning rook endgame."
  },
  {
    id: "pz-promotion-c8q",
    title: "Promote with Check",
    theme: "Pawn Promotion",
    category: "Basics",
    rating: 720,
    fen: "6k1/2P5/8/8/8/8/8/4K3 w - - 0 1",
    moves: ["c7c8q"],
    goal: "Push your passed pawn to the 8th rank and promote to a queen.",
    hints: [
      "The c7 pawn is one square from promotion.",
      "Advancing to c8 promotes and gives check.",
      "Move the pawn from c7 to c8 and pick Queen."
    ],
    success: "c8=Q+ promotes with check and wins the game."
  },
  {
    id: "pz-castling-safety",
    title: "Castle to Safety",
    theme: "King Safety",
    category: "Basics",
    rating: 700,
    fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
    moves: ["e1g1"],
    goal: "Tuck your king away and bring the h1 rook toward the center.",
    hints: [
      "Your kingside is cleared between king and rook.",
      "Kingside castling protects your king behind f2-g2-h2.",
      "Castle kingside by moving your king from e1 to g1."
    ],
    success: "O-O secures your king and activates your rook toward the e-file."
  },

  // --- TACTICS ---
  {
    id: "pz-fork-nc6",
    title: "Double Major Fork",
    theme: "Knight Fork",
    category: "Tactics",
    rating: 850,
    fen: "1r1qk3/8/8/4N3/8/8/8/4K3 w - - 0 1",
    moves: ["e5c6"],
    goal: "Jump your knight to attack both Black's queen and rook simultaneously.",
    hints: [
      "Knights fork pieces sitting on the same color squares.",
      "Look for a square hitting both b8 and d8.",
      "Jump the knight from e5 to c6."
    ],
    success: "Nc6 forks the queen on d8 and rook on b8, winning decisive material."
  },
  {
    id: "pz-royal-fork-nd6",
    title: "Royal Knight Fork",
    theme: "Knight Fork",
    category: "Tactics",
    rating: 950,
    fen: "2q1k3/8/8/8/2N5/8/8/4K3 w - - 0 1",
    moves: ["c4d6", "e8d7", "d6c8"],
    goal: "Fork the black king and queen with check, then capture the queen.",
    hints: [
      "Look for a knight check that also threatens c8.",
      "Your knight on c4 can leap forward into enemy territory.",
      "Play Nd6+, then take the queen on c8."
    ],
    success: "Nd6+ forces the king to step aside, letting you capture Nxc8!"
  },
  {
    id: "pz-pin-re4",
    title: "Absolute File Pin",
    theme: "Pin",
    category: "Tactics",
    rating: 850,
    fen: "4k3/8/8/8/4q3/8/4R3/4K3 w - - 0 1",
    moves: ["e2e4"],
    goal: "Win the pinned queen along the open e-file.",
    hints: [
      "The black queen is aligned directly in front of its king on the e-file.",
      "Capture directly along the e-file.",
      "Move the rook from e2 to e4."
    ],
    success: "Rxe4 wins the queen cleanly along the absolute pin."
  },
  {
    id: "pz-pin-bg5",
    title: "Pin and Pile Up",
    theme: "Pin",
    category: "Tactics",
    rating: 1120,
    fen: "r2qkb1r/ppp2ppp/2np1n2/4p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 6",
    moves: ["c1g5"],
    goal: "Pin the f6 knight to the black queen to prepare Nd5 pressure.",
    hints: [
      "Your dark-squared bishop on c1 has not moved yet.",
      "Look along the c1-h6 diagonal to freeze the f6 knight.",
      "Play Bg5."
    ],
    success: "Bg5 pins the knight to the queen, setting up Nd5 to exploit the pin."
  },
  {
    id: "pz-skewer-ra8",
    title: "Back-Rank Skewer",
    theme: "Skewer",
    category: "Tactics",
    rating: 1000,
    fen: "4k2q/8/8/8/8/8/R7/4K3 w - - 0 1",
    moves: ["a2a8", "e8f7", "a8h8"],
    goal: "Attack the king along the 8th rank to win the queen hiding behind it.",
    hints: [
      "The black king and queen stand on the same rank.",
      "Give check from the side so the king is forced off the 8th rank.",
      "Play Ra8+, then capture the queen on h8."
    ],
    success: "Ra8+ skewers the king to the queen—when the king moves, Rxh8 wins the queen!"
  },
  {
    id: "pz-skewer-bc4",
    title: "Diagonal Skewer",
    theme: "Skewer",
    category: "Tactics",
    rating: 1050,
    fen: "6r1/8/4k3/8/8/3B4/8/4K3 w - - 0 1",
    moves: ["d3c4", "e6d6", "c4g8"],
    goal: "Skewer the black king to the undefended rook along the a2-g8 diagonal.",
    hints: [
      "Notice Black's king on e6 and rook on g8 lie on the same dark-squared diagonal.",
      "Step your bishop onto the a2-g8 diagonal with check.",
      "Play Bc4+, then capture Bxg8."
    ],
    success: "Bc4+ forces the king off the diagonal, winning the g8 rook!"
  },
  {
    id: "pz-discovered-bxc3",
    title: "Deflection & Discovery",
    theme: "Discovered Attack",
    category: "Tactics",
    rating: 1180,
    fen: "r1b1k2r/pp3ppp/2n1p3/3q4/1b1P4/1PN2N2/PB1Q1PPP/R3KB1R b KQkq - 2 10",
    moves: ["b4c3"],
    goal: "Play as Black: damage White's queenside structure and seize central initiative.",
    hints: [
      "Look at your active bishop on b4 pinning the c3 knight.",
      "Eliminating the defender on c3 damages White's structure.",
      "Capture on c3 with the b4 bishop."
    ],
    success: "Bxc3 ruins White's pawn structure while Black's queen commands the center."
  },
  {
    id: "pz-rook-lift-rb8",
    title: "8th-Rank Pin",
    theme: "File Control",
    category: "Tactics",
    rating: 1100,
    fen: "r4rk1/5ppp/8/8/8/8/5PPP/1R4K1 w - - 0 1",
    moves: ["b1b8"],
    goal: "Challenge Black's back rank by pinning the a8 rook.",
    hints: [
      "Look down the open b-file.",
      "Infiltrating to the 8th rank pins a8 to f8.",
      "Move the rook from b1 to b8."
    ],
    success: "Rb8 pins the a8 rook to f8 and forces a favorable rook exchange."
  },

  // --- OPENINGS ---
  {
    id: "pz-open-d4",
    title: "Claim the Full Center",
    theme: "Opening Principles",
    category: "Openings",
    rating: 750,
    fen: "rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
    moves: ["d2d4"],
    goal: "Black played 1...e6; occupy the center with your second central pawn.",
    hints: [
      "Follow classical opening principles: control the center.",
      "Black did not challenge d4 immediately.",
      "Push your d-pawn two squares to d4."
    ],
    success: "1.e4 e6 2.d4 claims the ideal central pawn duo and frees both bishops."
  },
  {
    id: "pz-open-bc4",
    title: "Italian Bishop Development",
    theme: "Italian Game",
    category: "Openings",
    rating: 800,
    fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
    moves: ["f1c4"],
    goal: "Develop your bishop toward Black's weakest early square, f7.",
    hints: [
      "The kingside bishop should develop actively before castling.",
      "Look at the a2-g8 diagonal pointing at f7.",
      "Move the bishop from f1 to c4."
    ],
    success: "Bc4 enters the Italian Game, eyeing f7 and preparing O-O."
  },
  {
    id: "pz-open-c3",
    title: "Support the Italian Center",
    theme: "Italian Game",
    category: "Openings",
    rating: 950,
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 1 5",
    moves: ["c2c3"],
    goal: "Prepare d4 and give your c4 bishop a retreat square on b3/c2.",
    hints: [
      "A modest pawn move prepares central expansion.",
      "Support the d4 square and build a shelter for your bishop.",
      "Play c3."
    ],
    success: "c3 bolsters d4 and prevents ...Na5 from trapping your Italian bishop."
  },
  {
    id: "pz-open-e6",
    title: "Queen's Gambit Declined",
    theme: "Queen's Gambit",
    category: "Openings",
    rating: 900,
    fen: "rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2",
    moves: ["e7e6"],
    goal: "Play as Black: solidly reinforce your d5 central pawn.",
    hints: [
      "White offers a wing pawn to lure your d5 pawn away.",
      "Support d5 with a central pawn while opening the f8 bishop.",
      "Play e6."
    ],
    success: "2...e6 maintains a rock-solid presence in the center."
  },

  // --- MIDDLEGAME ---
  {
    id: "pz-mid-nd5",
    title: "Anchor the Knight Outpost",
    theme: "Outposts",
    category: "Middlegame",
    rating: 1150,
    fen: "r1bqkb1r/pp3ppp/2n5/4p3/4P3/2N5/PPP2PPP/R1BQK2R w KQkq - 0 1",
    moves: ["c3d5"],
    goal: "Plant your knight on a central square where no enemy pawn can chase it away.",
    hints: [
      "Black has moved both the c- and e-pawns, leaving a hole on d5.",
      "Jump your knight into that outpost.",
      "Move the knight from c3 to d5."
    ],
    success: "Nd5 seizes a permanent central outpost dominating Black's camp."
  },
  {
    id: "pz-mid-rb7",
    title: "Seventh-Rank Invasion",
    theme: "Open Files",
    category: "Middlegame",
    rating: 1100,
    fen: "2r3k1/5ppp/8/8/8/8/1R3PPP/4R1K1 w - - 0 1",
    moves: ["b2b7"],
    goal: "Invade the 7th rank with your rook to tie down Black's pawns and king.",
    hints: [
      "Look down the open b-file.",
      "Rooks on the 7th rank attack side pawns and cut off the enemy king.",
      "Play Rb7."
    ],
    success: "Rb7 penetrates to the 7th rank, paralyzing Black's kingside."
  },
  {
    id: "pz-mid-cxd5",
    title: "Central Pawn Break",
    theme: "Pawn Structure",
    category: "Middlegame",
    rating: 1200,
    fen: "r1bqk2r/pp2bppp/2n1pn2/2pp4/2PP4/2N1PN2/PP2BPPP/R1BQK2R w KQkq - 0 7",
    moves: ["c4d5"],
    goal: "Resolve central tension to open the c-file and isolate Black's pawn.",
    hints: [
      "Look at the pawn tension in the center.",
      "Trading on d5 opens lines for your rook and bishop.",
      "Capture on d5 with your c4 pawn."
    ],
    success: "cxd5 opens the c-file and creates structural targets for White."
  },

  // --- ENDGAME ---
  {
    id: "pz-end-ke4",
    title: "Activate the King",
    theme: "King Activity",
    category: "Endgame",
    rating: 850,
    fen: "8/5p2/4pk2/8/8/4K3/5PPP/8 w - - 0 1",
    moves: ["e3e4"],
    goal: "In the endgame, march your king forward toward the center.",
    hints: [
      "Without queens on the board, the king becomes a fighting piece.",
      "Claim central squares before Black's king steps up.",
      "Move your king from e3 to e4."
    ],
    success: "Ke4 centralizes the king and fights for key squares."
  },
  {
    id: "pz-end-opposition",
    title: "Pawn Tempo & Opposition",
    theme: "Opposition",
    category: "Endgame",
    rating: 1050,
    fen: "8/8/3k4/8/3K4/4P3/8/8 w - - 0 1",
    moves: ["e3e4"],
    goal: "Use a pawn tempo so Black's king must give up the opposition.",
    hints: [
      "Notice the kings are facing each other vertically.",
      "Push your pawn to force Black to move away.",
      "Advance e3 to e4."
    ],
    success: "e4 keeps the opposition and clears the path toward promotion."
  },
  {
    id: "pz-end-lucena",
    title: "Lucena Cutoff",
    theme: "Lucena Bridge",
    category: "Endgame",
    rating: 1250,
    fen: "1K1k4/1P6/8/8/8/8/2R5/8 w - - 0 1",
    moves: ["c2d2"],
    goal: "Check the black king to drive it away from your passed b7 pawn.",
    hints: [
      "Your king is blocking the b7 pawn on b8, so you need to step out.",
      "Cut the black king off with a rook check.",
      "Play Rd2+."
    ],
    success: "Rd2+ forces the black king to the e-file, letting your king step out and promote."
  },
  {
    id: "pz-end-philidor-step",
    title: "Step Toward the Rook",
    theme: "Rook Endgame",
    category: "Endgame",
    rating: 1150,
    fen: "4k3/R7/8/4P3/8/8/8/4K2r w - - 0 1",
    moves: ["e1e2"],
    goal: "Escape the check while stepping forward to support your e5 pawn.",
    hints: [
      "Your king is in check along the 1st rank.",
      "Step forward toward the center and your passed pawn.",
      "Move the king from e1 to e2."
    ],
    success: "Ke2 gets out of check and keeps your king active."
  }
];

export const courses: Course[] = [
  {
    id: "basics",
    title: "Basics & Board Vision",
    subtitle: "Loose pieces, king safety, and clean conversions",
    description: "Build blunder-free awareness: spot undefended pieces, castle on time, and promote passed pawns.",
    category: "Basics",
    recommendedFor: "New players & <900"
  },
  {
    id: "checkmates",
    title: "Checkmate Patterns",
    subtitle: "Back-rank, smothered, ladder, and Arabian mates",
    description: "Recognize forcing mating geometry instantly so winning positions never slip away.",
    category: "Checkmates",
    recommendedFor: "All ratings"
  },
  {
    id: "tactics",
    title: "Tactics Mastery",
    subtitle: "Forks, pins, skewers, and overloaded defenders",
    description: "Learn each tactical motif step-by-step: see the pattern, test it with feedback, then drill.",
    category: "Tactics",
    recommendedFor: "800–1600"
  },
  {
    id: "openings",
    title: "Opening Principles & Repertoires",
    subtitle: "Center control, Italian, Ruy Lopez, Sicilian, Queen's Gambit",
    description: "Understand the strategic ideas behind opening moves instead of memorizing blind theory.",
    category: "Openings",
    recommendedFor: "All ratings"
  },
  {
    id: "middlegame",
    title: "Middlegame Strategy",
    subtitle: "Outposts, open files, 7th-rank rooks, and pawn breaks",
    description: "Turn quiet middlegames into clear plans by targeting weak squares and open files.",
    category: "Middlegame",
    recommendedFor: "1000–1800"
  },
  {
    id: "endgame",
    title: "Endgame Technique",
    subtitle: "King activity, opposition, and rook endgames",
    description: "Convert small advantages cleanly and defend tough rook endings accurately.",
    category: "Endgame",
    recommendedFor: "900–1800+"
  }
];

export const lessons: Lesson[] = [
  // --- BASICS ---
  {
    id: "basics.loose_pieces",
    courseId: "basics",
    unit: "Unit 1 · Board Safety",
    title: "Spotting Undefended Pieces",
    subtitle: "Stop hanging material and punish loose enemy pieces",
    level: "Novice",
    estimatedMinutes: 4,
    goal: "Scan for undefended queens, rooks, bishops, and knights before calculating deeper.",
    steps: [
      {
        type: "explain",
        title: "LPDO: Loose Pieces Drop Off",
        paragraphs: [
          "Most beginner and intermediate games are decided not by 5-move combinations, but by pieces left without a defender.",
          "Before choosing a quiet developing move, pause for 3 seconds and scan every enemy piece: is it guarded by a pawn or another piece? Here, Black's queen on d4 has zero defenders."
        ],
        fen: "4k3/8/8/8/3q4/8/3R4/4K3 w - - 0 1",
        arrows: [{ from: "d2", to: "d4", color: "sage" }],
        highlightSquares: ["d4"]
      },
      {
        type: "try",
        title: "Guided Check: Find the Free Capture",
        prompt: "White to move. One piece on the board is completely undefended. Capture it cleanly.",
        fen: "4k3/8/8/3b4/8/8/3R4/4K3 w - - 0 1",
        solutions: ["d2d5"],
        hints: [
          "Scan along the open d-file.",
          "Black's bishop on d5 has no defenders.",
          "Capture on d5 with your rook."
        ],
        specificFeedback: {
          d2d1: "Moving backward misses the completely free bishop sitting right in front of your rook on d5."
        },
        onWrongFallback: "That move misses the undefended bishop on d5. Look straight up the d-file.",
        onCorrect: "Rxd5! Always capture free material first before making quiet moves."
      },
      {
        type: "practice",
        title: "Practice Loose Pieces",
        puzzleIds: ["pz-hanging-rxd4", "pz-remove-defender-rxd5"]
      },
      {
        type: "recap",
        title: "What to Remember",
        points: [
          "Check for undefended opponent pieces on every turn.",
          "Verify your own piece stays guarded after moving it.",
          "Checks and captures come first in your candidate-move checklist."
        ],
        nextTip: "Next, learn how castling protects your king and connects your rooks."
      }
    ]
  },
  {
    id: "basics.king_safety",
    courseId: "basics",
    unit: "Unit 1 · Board Safety",
    title: "Castling & Pawn Promotion",
    subtitle: "King safety early, passed pawns late",
    level: "Novice",
    estimatedMinutes: 4,
    goal: "Know when to castle to protect your king and how passed pawns win endgames.",
    steps: [
      {
        type: "explain",
        title: "Why Castling Matters",
        paragraphs: [
          "Leaving your king on e1 or e8 in the center invites checks down the open e-file and pins along the diagonals.",
          "Castling kingside tucks your king safely behind the f2, g2, and h2 pawns while bringing your h1 rook toward the center in a single move."
        ],
        fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
        arrows: [{ from: "e1", to: "g1", color: "brass" }],
        highlightSquares: ["g1", "f1"]
      },
      {
        type: "try",
        title: "Guided Check: Castle to Safety",
        prompt: "White to move. Both minor pieces are developed—secure your king immediately.",
        fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4",
        solutions: ["e1g1"],
        hints: [
          "Your king sits in the middle while Black is ready to castle too.",
          "Use the special two-square king move on the kingside.",
          "Move your king from e1 to g1 to castle."
        ],
        specificFeedback: {
          b1c3: "Developing is good, but securing your king with O-O first prevents tactical surprises on the e-file."
        },
        onWrongFallback: "Look at your king on e1—you can castle kingside right now.",
        onCorrect: "O-O! Your king is tucked safely away and your rook enters the game."
      },
      {
        type: "practice",
        title: "Practice King Safety & Promotion",
        puzzleIds: ["pz-castling-safety", "pz-promotion-c8q"]
      },
      {
        type: "recap",
        title: "Key Takeaways",
        points: [
          "Castle within the first 8–10 moves once your kingside is clear.",
          "A passed pawn on the 7th rank is a huge threat—promote to a queen unless underpromotion avoids stalemate.",
          "Always verify promotion squares are safe."
        ],
        nextTip: "Move on to Checkmate Patterns to convert winning attacks cleanly."
      }
    ]
  },

  // --- CHECKMATES ---
  {
    id: "checkmates.back_rank",
    courseId: "checkmates",
    unit: "Unit 2 · Mating Nets",
    title: "Back-Rank Checkmate & Luft",
    subtitle: "Punish kings trapped behind unmoved pawns",
    level: "Novice",
    estimatedMinutes: 5,
    goal: "Spot back-rank weaknesses and understand how an overloaded defender collapses.",
    steps: [
      {
        type: "explain",
        title: "The Fatal Back-Rank Wall",
        paragraphs: [
          "When a castled king sits behind three unmoved pawns (f7-g7-h7 or f2-g2-h2), those pawns form a prison wall.",
          "If no rook or queen guards the 8th rank, a single rook check on e8 delivers instant checkmate. That is why masters often play h3 or h6 ('luft' — breathing room) before moving heavy pieces away."
        ],
        fen: "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1",
        arrows: [{ from: "e1", to: "e8", color: "sage" }],
        highlightSquares: ["f7", "g7", "h7"]
      },
      {
        type: "demo",
        title: "See It Happen: Overloading the Defender",
        fen: "3r2k1/5ppp/8/8/4b3/8/3R1PPP/3R2K1 w - - 0 1",
        moves: ["d2d8"],
        captions: [
          "White doubles rooks on the d-file. Because two rooks attack d8 and Black only has one rook defending, 1. Rxd8# forces checkmate on the spot!"
        ]
      },
      {
        type: "try",
        title: "Guided Check: Deliver Back-Rank Mate",
        prompt: "White to move. Black's king has no escape square on the 7th rank.",
        fen: "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1",
        solutions: ["e1e8"],
        hints: [
          "Check Black's f7, g7, and h7 pawns—they seal the 7th rank.",
          "Bring your rook all the way down the open e-file.",
          "Play Re8#."
        ],
        specificFeedback: {
          g1f1: "Don't waste a tempo moving your king when Black's back rank is wide open!"
        },
        onWrongFallback: "Look at Black's 8th rank: Re8 delivers checkmate immediately.",
        onCorrect: "Re8#! Back-rank weakness punished in one move."
      },
      {
        type: "practice",
        title: "Back-Rank & Corridor Drills",
        puzzleIds: ["pz-backrank-re8", "pz-overload-rxd8", "pz-ladder-rh8"]
      },
      {
        type: "recap",
        title: "Checklist for Back Ranks",
        points: [
          "Count attackers vs defenders on the enemy back rank.",
          "Watch for doubled rooks or a rook + queen battery.",
          "Create 'luft' (h3/h6) in your own games when heavy pieces leave the back rank."
        ],
        nextTip: "Next lesson: Smothered & Arabian Mates using knights."
      }
    ]
  },
  {
    id: "checkmates.knight_mates",
    courseId: "checkmates",
    unit: "Unit 2 · Mating Nets",
    title: "Smothered & Arabian Mates",
    subtitle: "Cornered kings and knight geometry",
    level: "Apprentice",
    estimatedMinutes: 5,
    goal: "Master how knights seal corner escape squares in Smothered and Arabian mates.",
    steps: [
      {
        type: "explain",
        title: "Why Knights Deliver Unique Mates",
        paragraphs: [
          "A knight is the only piece that can attack a king through a wall of enemy pawns and pieces—without opening a flight square.",
          "In a Smothered Mate, the enemy king is boxed in by its own rook and pawns. In an Arabian Mate, a knight on f6 guards a rook check on h7 while covering g8."
        ],
        fen: "6rk/6pp/7N/8/8/8/8/4K3 w - - 0 1",
        arrows: [{ from: "h6", to: "f7", color: "sage" }],
        highlightSquares: ["g8", "g7", "h7"]
      },
      {
        type: "try",
        title: "Guided Check: Arabian Mate",
        prompt: "White to move. Your knight on f6 already seals g8. Finish the king in the corner!",
        fen: "7k/8/5N2/8/8/8/7R/4K3 w - - 0 1",
        solutions: ["h2h7"],
        hints: [
          "The knight on f6 defends h7 AND covers g8.",
          "Bring your rook directly next to the black king.",
          "Play Rh7#."
        ],
        specificFeedback: {
          h2h8: "Rh8+ allows Black to capture your rook with the king (Kxh8) because h8 is not guarded by your knight!"
        },
        onWrongFallback: "Remember: your knight defends h7 and covers g8, not h8.",
        onCorrect: "Rh7#! Classic Arabian Mate."
      },
      {
        type: "practice",
        title: "Pattern Recognition Drills",
        puzzleIds: ["pz-smothered-nf7", "pz-arabian-rh7", "pz-epaulette-qe6", "pz-mate1-qg7"]
      },
      {
        type: "recap",
        title: "Knight Mating Geometry",
        points: [
          "Knight on f6 + Rook on h7 = Arabian Mate against a cornered king.",
          "Boxed-in corner kings are always vulnerable to Nf7# smothered mates.",
          "Verify whether the checking piece is protected before checking next to the king."
        ],
        nextTip: "Ready for Tactics Mastery: start with Knight Forks."
      }
    ]
  },

  // --- TACTICS ---
  {
    id: "tactics.knight_forks",
    courseId: "tactics",
    unit: "Unit 3 · Double Attacks",
    title: "Knight Forks",
    subtitle: "Attack two high-value targets in one jump",
    level: "Novice",
    estimatedMinutes: 6,
    goal: "Spot knight jumps that hit two enemy pieces—especially with check so the opponent cannot save both.",
    steps: [
      {
        type: "explain",
        title: "How Knight Forks Work",
        paragraphs: [
          "A fork is a single move that attacks two or more targets at the same time. Knights are deadly forkers because their L-shaped jump cannot be blocked.",
          "Pro tip: knights ALWAYS land on the opposite color square from where they start—so two enemy pieces on the SAME color squares are prime targets for a knight fork."
        ],
        fen: "1r1qk3/8/8/4N3/8/8/8/4K3 w - - 0 1",
        arrows: [
          { from: "e5", to: "c6", color: "brass" },
          { from: "c6", to: "b8", color: "coral" },
          { from: "c6", to: "d8", color: "coral" }
        ],
        highlightSquares: ["b8", "d8"]
      },
      {
        type: "demo",
        title: "Watch a Royal Fork Unfold",
        fen: "2q1k3/8/8/8/2N5/8/8/4K3 w - - 0 1",
        moves: ["c4d6", "e8d7", "d6c8"],
        captions: [
          "1. Nd6+! The knight forks the king on e8 and the queen on c8 with check.",
          "Black MUST answer the check and steps the king to d7.",
          "2. Nxc8 wins the queen cleanly."
        ]
      },
      {
        type: "try",
        title: "Guided Check: Find the Fork",
        prompt: "White to move. Both Black's queen and rook stand on the 8th rank. Where does the e5 knight jump?",
        fen: "1r1qk3/8/8/4N3/8/8/8/4K3 w - - 0 1",
        solutions: ["e5c6"],
        hints: [
          "Look for a square that attacks both b8 and d8.",
          "Notice b8 and d8 are both dark squares—your knight needs to land on a light square.",
          "Jump the knight from e5 to c6."
        ],
        specificFeedback: {
          e5d7: "Nd7 forks b8 and e8? No—e8 isn't hit from d7, and the queen on d8 simply captures Nd7 (Qxd7)!",
          e5f7: "Nf7 hits the queen on d8, but the rook on b8 escapes and Black isn't forked."
        },
        onWrongFallback: "Check all squares your knight on e5 can reach. Only one square hits both b8 and d8 safely.",
        onCorrect: "Nc6! Forking the queen and rook wins major material."
      },
      {
        type: "practice",
        title: "Knight Fork Practice",
        puzzleIds: ["pz-fork-nc6", "pz-royal-fork-nd6"]
      },
      {
        type: "recap",
        title: "3 Signals to Spot Knight Forks",
        points: [
          "Look when two major pieces sit on the same color squares.",
          "Forks with check ('Royal Forks') are unstoppable because the opponent cannot block or flee with the other piece.",
          "Always verify the landing square isn't guarded by an enemy pawn or minor piece."
        ],
        nextTip: "Next tactic: Pins & Skewers along open files and diagonals."
      }
    ]
  },
  {
    id: "tactics.pins_and_skewers",
    courseId: "tactics",
    unit: "Unit 3 · Line Tactics",
    title: "Pins & Skewers",
    subtitle: "Freeze defenders or pierce through the king",
    level: "Apprentice",
    estimatedMinutes: 6,
    goal: "Tell the difference between a pin (low-value in front) and a skewer (high-value in front) and exploit both.",
    steps: [
      {
        type: "explain",
        title: "Pin vs. Skewer",
        paragraphs: [
          "In a PIN, a less valuable piece shields a king or queen behind it—so the front piece cannot move (or shouldn't move).",
          "In a SKEWER, the MORE valuable piece (often the king) is in front! When you check the king, it must step aside, letting you capture the rook or queen behind it."
        ],
        fen: "4k2q/8/8/8/8/8/R7/4K3 w - - 0 1",
        arrows: [
          { from: "a2", to: "a8", color: "brass" },
          { from: "a8", to: "h8", color: "coral" }
        ],
        highlightSquares: ["e8", "h8"]
      },
      {
        type: "demo",
        title: "Diagonal Skewer in Action",
        fen: "6r1/8/4k3/8/8/3B4/8/4K3 w - - 0 1",
        moves: ["d3c4", "e6d6", "c4g8"],
        captions: [
          "1. Bc4+ skewers the black king on e6 to the undefended rook on g8.",
          "The king has to move out of check (1...Kd6).",
          "2. Bxg8 wins the rook cleanly!"
        ]
      },
      {
        type: "try",
        title: "Guided Check: Pin and Pile Up",
        prompt: "White to move. Black's knight on f6 sits in front of the queen on d8. Pin it now!",
        fen: "r2qkb1r/ppp2ppp/2np1n2/4p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 6",
        solutions: ["c1g5"],
        hints: [
          "Use a long-range piece that attacks along the h4-d8 diagonal.",
          "Your dark-squared bishop on c1 is ready to enter.",
          "Play Bg5."
        ],
        specificFeedback: {
          c3d5: "Playing Nd5 before pinning allows Black to simply trade knights with ...Nxd5."
        },
        onWrongFallback: "Look at the c1 bishop—you can pin the f6 knight to the queen on d8.",
        onCorrect: "Bg5! Now the knight is pinned to the queen and Nd5 becomes a huge threat."
      },
      {
        type: "practice",
        title: "Pins & Skewers Drills",
        puzzleIds: ["pz-pin-re4", "pz-pin-bg5", "pz-skewer-ra8", "pz-skewer-bc4"]
      },
      {
        type: "recap",
        title: "Key Rules for Pins & Skewers",
        points: [
          "Rule of the Pin: 'PP on the PP' — Put Pressure on the Pinned Piece (don't cash in too early!).",
          "When two enemy pieces share a rank, file, or diagonal, immediately check if a rook, bishop, or queen can skewer them.",
          "Always verify the checking square is safe."
        ],
        nextTip: "Explore Opening Principles & Repertoires next."
      }
    ]
  },

  // --- OPENINGS ---
  {
    id: "openings.golden_rules",
    courseId: "openings",
    unit: "Unit 4 · Opening Foundations",
    title: "Golden Rules of the Opening",
    subtitle: "Center control, rapid development, and king safety",
    level: "Novice",
    estimatedMinutes: 5,
    goal: "Apply the three core opening principles in any position—even outside book theory.",
    steps: [
      {
        type: "explain",
        title: "The Three Pillars",
        paragraphs: [
          "Every strong opening—Italian, Ruy Lopez, Queen's Gambit—rests on three habits: (1) Stake pawns in the center (e4, d4 / e5, d5), (2) Develop knights and bishops toward the center without moving the same piece twice, and (3) Castle early.",
          "When Black plays a passive first move like 1...e6, White immediately grabs the full center with 2. d4."
        ],
        fen: "rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
        arrows: [{ from: "d2", to: "d4", color: "sage" }],
        highlightSquares: ["d4", "e4", "d5", "e5"]
      },
      {
        type: "try",
        title: "Guided Check: Seize the Center",
        prompt: "White to move after 1. e4 e6. Claim the second central square!",
        fen: "rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
        solutions: ["d2d4"],
        hints: [
          "Control e4, d4, e5, d5 with pawns and minor pieces.",
          "Black hasn't challenged d4 yet.",
          "Push d2 to d4."
        ],
        specificFeedback: {
          d1h5: "Bringing the queen out early wastes time when Black develops with ...Nc6 or ...Nf6!"
        },
        onWrongFallback: "Claim the center with your d-pawn while Black gives you space.",
        onCorrect: "2. d4! Both central pawns control key squares and open lines for your bishops."
      },
      {
        type: "practice",
        title: "Opening Principles Drills",
        puzzleIds: ["pz-open-d4", "pz-open-bc4", "pz-castling-safety"]
      },
      {
        type: "recap",
        title: "Opening Checklist",
        points: [
          "Occupy the center with e4/d4 (or challenge it with ...e5/...d5/...c5).",
          "Develop knights before bishops toward central squares.",
          "Avoid moving the queen early or moving the same piece twice without a tactical reason."
        ],
        nextTip: "Dive into specific openings like the Italian Game and Queen's Gambit."
      }
    ]
  },
  {
    id: "openings.italian_game",
    courseId: "openings",
    unit: "Unit 4 · Classical 1.e4",
    title: "The Italian Game",
    subtitle: "1. e4 e5 2. Nf3 Nc6 3. Bc4 — targeting f7",
    level: "Novice",
    estimatedMinutes: 5,
    goal: "Learn why Bc4 targets f7 and how c3 prepares a strong d4 center.",
    steps: [
      {
        type: "explain",
        title: "Targeting f7 & Preparing d4",
        paragraphs: [
          "In the Italian Game, White develops 3. Bc4 to aim directly at Black's weakest early square: f7, which is guarded only by the black king.",
          "Later, White plays c3 to support d4—building a strong central pawn duo while keeping a retreat square on c2/b3 for the bishop."
        ],
        fen: "r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3",
        arrows: [{ from: "c4", to: "f7", color: "coral" }],
        highlightSquares: ["f7", "c4"]
      },
      {
        type: "demo",
        title: "Typical Italian Setup",
        fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
        moves: ["f1c4", "f8c5", "c2c3", "g8f6", "d2d4"],
        captions: [
          "3. Bc4 aims at f7.",
          "3...Bc5 mirrors development (Giuoco Piano).",
          "4. c3 prepares the central d4 advance.",
          "4...Nf6 attacks e4.",
          "5. d4 strikes in the center with tempo against the c5 bishop!"
        ]
      },
      {
        type: "try",
        title: "Guided Check: Italian Move 3",
        prompt: "White to move. Enter the Italian Game by aiming at Black's f7 square.",
        fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3",
        solutions: ["f1c4"],
        hints: [
          "Develop your kingside bishop.",
          "Place it on the a2-g8 diagonal pointing at f7.",
          "Play Bc4."
        ],
        specificFeedback: {
          f1b5: "Bb5 is the Ruy Lopez (also great!), though here we're aiming directly at f7 with the Italian Bc4."
        },
        onWrongFallback: "Develop your f1 bishop to target f7.",
        onCorrect: "Bc4! Classic Italian development."
      },
      {
        type: "practice",
        title: "Italian Game Drills",
        puzzleIds: ["pz-open-bc4", "pz-open-c3", "pz-pin-bg5"]
      },
      {
        type: "recap",
        title: "Italian Ideas to Remember",
        points: [
          "3. Bc4 eyes f7 and keeps your kingside clear for early castling.",
          "Play c3 + d4 to contest the center rather than rushing premature flank attacks.",
          "Watch out for ...Ng4 tricks before you castle."
        ],
        nextTip: "Practice the Italian Game against a bot in Play mode!"
      }
    ]
  },
  {
    id: "openings.queens_gambit",
    courseId: "openings",
    unit: "Unit 4 · Classical 1.d4",
    title: "Queen's Gambit & Central Tension",
    subtitle: "Why White offers c4 and how Black defends d5",
    level: "Apprentice",
    estimatedMinutes: 5,
    goal: "Understand central tension in 1.d4 d5 2.c4 and why Black reinforces d5 instead of hanging onto c4.",
    steps: [
      {
        type: "explain",
        title: "Not a Real Sacrifice",
        paragraphs: [
          "With 2. c4, White offers a flank c-pawn to lure Black's central d5 pawn away. If Black takes (2...dxc4), White can quickly dominate the center with e4 and regain the pawn with Bxc4.",
          "Therefore, Black most often supports d5 with 2...e6 (Queen's Gambit Declined) or 2...c6 (Slav Defense)."
        ],
        fen: "rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2",
        arrows: [{ from: "c4", to: "d5", color: "brass" }],
        highlightSquares: ["d5", "c4"]
      },
      {
        type: "try",
        title: "Guided Check: Hold the Center as Black",
        prompt: "Black to move after 1. d4 d5 2. c4. Reinforce d5 solidly!",
        fen: "rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2",
        solutions: ["e7e6", "c7c6"],
        hints: [
          "Keep a pawn anchored on d5 rather than surrendering the center.",
          "Support d5 with either the e-pawn or the c-pawn.",
          "Play 2...e6 (or 2...c6)."
        ],
        specificFeedback: {
          d5c4: "Taking on c4 surrenders the center—White gets e3/e4 and wins the pawn back effortlessly."
        },
        onWrongFallback: "Support your d5 pawn with e6 or c6.",
        onCorrect: "Solid! Holding d5 keeps equal central influence."
      },
      {
        type: "practice",
        title: "Queen's Gambit Drills",
        puzzleIds: ["pz-open-e6", "pz-mid-cxd5"]
      },
      {
        type: "recap",
        title: "Queen's Gambit Essentials",
        points: [
          "c4 attacks d5 from the flank to fight for central control.",
          "As Black, support d5 with ...e6 or ...c6 rather than trying to cling to the c4 pawn.",
          "Develop the queen's knight behind the c-pawn (Nc3 for White, ...c5 breaks later for Black)."
        ],
        nextTip: "Explore the Opening Explorer tab in Learn to see master win rates."
      }
    ]
  },

  // --- MIDDLEGAME ---
  {
    id: "middlegame.outposts_and_files",
    courseId: "middlegame",
    unit: "Unit 5 · Positional Mastery",
    title: "Outposts & 7th-Rank Rooks",
    subtitle: "Permanent knight squares and rook infiltration",
    level: "Apprentice",
    estimatedMinutes: 5,
    goal: "Identify pawn-protected outposts for knights and open files for rooks to penetrate the 7th rank.",
    steps: [
      {
        type: "explain",
        title: "What Makes a Great Outpost?",
        paragraphs: [
          "An outpost is a square (usually on the 4th, 5th, or 6th rank) that NO enemy pawn can ever attack. Because Black has pushed both the c- and e-pawns here, d5 is a permanent stronghold.",
          "Planting a knight on d5 supported by the e4 pawn splits the enemy board in two."
        ],
        fen: "r1bqkb1r/pp3ppp/2n5/4p3/4P3/2N5/PPP2PPP/R1BQK2R w KQkq - 0 1",
        arrows: [{ from: "c3", to: "d5", color: "sage" }],
        highlightSquares: ["d5", "e4"]
      },
      {
        type: "try",
        title: "Guided Check: Invade the 7th Rank",
        prompt: "White to move. Open b-file, enemy king on g8. Where does the b2 rook belong?",
        fen: "2r3k1/5ppp/8/8/8/8/1R3PPP/4R1K1 w - - 0 1",
        solutions: ["b2b7"],
        hints: [
          "Rooks belong on open files—and their dream destination is the 7th rank.",
          "Attack f7 and a7 while keeping Black's pawns pinned down.",
          "Play Rb7."
        ],
        specificFeedback: {
          b2b8: "Rb8? Black's c8 rook isn't pinned, wait—Rxb8 would just capture your rook! Land on the 7th rank instead."
        },
        onWrongFallback: "Look at the 7th rank—infiltrate with Rb7.",
        onCorrect: "Rb7! A rook on the 7th rank ties down enemy pawns and cuts off the king."
      },
      {
        type: "practice",
        title: "Positional Drills",
        puzzleIds: ["pz-mid-nd5", "pz-mid-rb7", "pz-rook-lift-rb8"]
      },
      {
        type: "recap",
        title: "Positional Habits",
        points: [
          "Look for 'holes' in your opponent's pawn chain to anchor knights.",
          "Place rooks on open or half-open files before trading them.",
          "A rook on the 7th rank is often worth a pawn in activity."
        ],
        nextTip: "Finish your core curriculum with Endgame Technique."
      }
    ]
  },

  // --- ENDGAME ---
  {
    id: "endgame.king_and_opposition",
    courseId: "endgame",
    unit: "Unit 6 · Pawn Endgames",
    title: "King Activity & Opposition",
    subtitle: "Activate the king and win key squares",
    level: "Novice",
    estimatedMinutes: 5,
    goal: "Use the king as an active endgame piece and understand pawn tempos to seize opposition.",
    steps: [
      {
        type: "explain",
        title: "The King Becomes an Attacker",
        paragraphs: [
          "In the opening and middlegame, the king hides in the corner. Once queens leave the board, the king is worth about 4 points of fighting power!",
          "In King + Pawn endings, 'Opposition' means placing your king directly across from the enemy king (with one square between) when it is THEIR turn to move—forcing them to step aside."
        ],
        fen: "8/8/3k4/8/3K4/4P3/8/8 w - - 0 1",
        arrows: [{ from: "e3", to: "e4", color: "brass" }],
        highlightSquares: ["d4", "d6", "e4"]
      },
      {
        type: "try",
        title: "Guided Check: Spare Pawn Tempo",
        prompt: "White to move. If your king moves away, Black keeps control. Use a pawn move to keep the opposition!",
        fen: "8/8/3k4/8/3K4/4P3/8/8 w - - 0 1",
        solutions: ["e3e4"],
        hints: [
          "Look at the kings on d4 and d6—you currently have the opposition if it were Black's move.",
          "Pass the turn to Black without moving your king.",
          "Push the pawn from e3 to e4."
        ],
        specificFeedback: {
          d4c4: "Moving your king lets Black play ...Kc6 or ...Ke5 and fight back. Use the pawn move e4 to pass the turn!"
        },
        onWrongFallback: "Use your spare pawn tempo (e4) so Black has to give way.",
        onCorrect: "e4! Black must now retreat the king, letting your king advance to c5 or e5."
      },
      {
        type: "practice",
        title: "Endgame Technique Drills",
        puzzleIds: ["pz-end-ke4", "pz-end-opposition", "pz-end-lucena", "pz-end-philidor-step"]
      },
      {
        type: "recap",
        title: "Endgame Golden Rules",
        points: [
          "Centralize your king immediately when queens come off.",
          "Use pawn tempos carefully to preserve opposition.",
          "In rook endings, keep rooks active—cut off the enemy king (Lucena) or check from behind."
        ],
        nextTip: "You've completed the core track! Test your knowledge in Play or Review."
      }
    ]
  }
];

export const placementQuestions: {
  id: string;
  rating: number;
  prompt: string;
  fen: string;
  expected: string;
}[] = [
  {
    id: "pl-1",
    rating: 700,
    prompt: "White to move. Capture the completely undefended piece.",
    fen: "4k3/8/8/8/3q4/8/3R4/4K3 w - - 0 1",
    expected: "d2d4"
  },
  {
    id: "pl-2",
    rating: 900,
    prompt: "White to move. Deliver checkmate on the back rank.",
    fen: "6k1/5ppp/8/8/8/8/5PPP/4R1K1 w - - 0 1",
    expected: "e1e8"
  },
  {
    id: "pl-3",
    rating: 1100,
    prompt: "White to move. Fork two major black pieces with one jump.",
    fen: "1r1qk3/8/8/4N3/8/8/8/4K3 w - - 0 1",
    expected: "e5c6"
  },
  {
    id: "pl-4",
    rating: 1300,
    prompt: "White to move. Pin the f6 knight to the black queen.",
    fen: "r2qkb1r/ppp2ppp/2np1n2/4p3/2B1P3/2NP1N2/PPP2PPP/R1BQK2R w KQkq - 0 6",
    expected: "c1g5"
  },
  {
    id: "pl-5",
    rating: 1500,
    prompt: "White to move. Cut off the black king in this rook endgame.",
    fen: "1K1k4/1P6/8/8/8/8/2R5/8 w - - 0 1",
    expected: "c2d2"
  }
];

// Helper lookup maps
export function getPuzzleById(id: string): CuratedPuzzle | undefined {
  return curatedPuzzles.find(p => p.id === id);
}

export function getLessonById(id: string): Lesson | undefined {
  return lessons.find(l => l.id === id);
}

export function getCourseById(id: string): Course | undefined {
  return courses.find(c => c.id === id);
}

// Legacy-compatible exports for quick reference
export const openingCourses = [
  { name: "Italian Game", subtitle: "1. e4 e5 2. Nf3 Nc6 3. Bc4", rank: "Novice", lessonId: "openings.italian_game" },
  { name: "Queen's Gambit", subtitle: "1. d4 d5 2. c4", rank: "Apprentice", lessonId: "openings.queens_gambit" },
  { name: "Opening Golden Rules", subtitle: "Center, development, and castling", rank: "Novice", lessonId: "openings.golden_rules" }
] as const;
