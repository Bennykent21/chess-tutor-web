export interface PlayableOpeningMoveNote {
  san: string;
  note: string;
}

export interface PlayableOpening {
  id: string;
  name: string;
  eco: string;
  /** Initial book moves played automatically to reach the starting tabiya if chosen as preset, or line guide */
  presetMoves: string[];
  /** Full guided opening line from move 1 with coaching notes */
  bookLine: PlayableOpeningMoveNote[];
  ideas: string;
}

export const PLAYABLE_OPENINGS: PlayableOpening[] = [
  {
    id: "standard",
    name: "Free Play (Standard)",
    eco: "A00",
    presetMoves: [],
    bookLine: [
      { san: "e4", note: "Claim central space and open diagonals for bishop and queen." },
      { san: "e5", note: "Contest the center symmetrically and free the dark-squared bishop." }
    ],
    ideas: "Fight for central control (e4, d4, e5, d5), develop knights before bishops, and castle early."
  },
  {
    id: "italian",
    name: "Italian Game",
    eco: "C50",
    presetMoves: [],
    bookLine: [
      { san: "e4", note: "Open the e-file and claim the center." },
      { san: "e5", note: "Challenge e4 symmetrically." },
      { san: "Nf3", note: "Develop the kingside knight with tempo on e5." },
      { san: "Nc6", note: "Defend e5 while developing toward the center." },
      { san: "Bc4", note: "Enter the Italian Game—aiming directly at Black's f7 square." },
      { san: "Bc5", note: "Mirror White's bishop activity on the kingside (Giuoco Piano)." },
      { san: "c3", note: "Prepare d4 and give the c4 bishop a safe retreat." },
      { san: "Nf6", note: "Counterattack White's e4 pawn." }
    ],
    ideas: "Direct pressure against the vulnerable f7 square. White builds a strong center with c3 and d4."
  },
  {
    id: "scotch",
    name: "Scotch Game",
    eco: "C45",
    presetMoves: [],
    bookLine: [
      { san: "e4", note: "Claim central space and open the f1-a6 diagonal." },
      { san: "e5", note: "Meet White symmetrically in the center." },
      { san: "Nf3", note: "Develop and attack e5." },
      { san: "Nc6", note: "Guard the e5 pawn with natural development." },
      { san: "d4", note: "Strike the center immediately to open lines (the Scotch Game)." },
      { san: "exd4", note: "Release central tension—best reply to avoid losing space." },
      { san: "Nxd4", note: "Recapture centrally with active piece play." },
      { san: "Bc5", note: "Challenge the centralized d4 knight immediately." }
    ],
    ideas: "Early central clash (3. d4) to open the position for White's bishops and knights right out of the gate."
  },
  {
    id: "ruy-lopez",
    name: "Ruy Lopez",
    eco: "C60",
    presetMoves: [],
    bookLine: [
      { san: "e4", note: "Stake out central space." },
      { san: "e5", note: "Respond symmetrically in the center." },
      { san: "Nf3", note: "Attack the e5 pawn and develop." },
      { san: "Nc6", note: "Defend e5 actively." },
      { san: "Bb5", note: "Enter the Spanish Opening—pressure the c6 defender of e5." },
      { san: "a6", note: "Challenge the bishop immediately (Morphy Defense)." },
      { san: "Ba4", note: "Maintain pressure on the a4-e8 diagonal." },
      { san: "Nf6", note: "Develop and counterattack e4." }
    ],
    ideas: "Long-term central pressure against c6 and e5, preparing c3, d4, and kingside castling."
  },
  {
    id: "sicilian",
    name: "Sicilian Defense",
    eco: "B20",
    presetMoves: [],
    bookLine: [
      { san: "e4", note: "Claim central territory." },
      { san: "c5", note: "Fight for d4 asymmetrically from the flank." },
      { san: "Nf3", note: "Develop and prepare an open d4 break." },
      { san: "d6", note: "Control e5 and prepare ...Nf6." },
      { san: "d4", note: "Open the center for active piece play." },
      { san: "cxd4", note: "Trade a flank c-pawn for White's central d-pawn." },
      { san: "Nxd4", note: "Centralize the knight into the open center." },
      { san: "Nf6", note: "Develop with tempo against e4." }
    ],
    ideas: "Asymmetric battle: Black gets an open c-file and extra central pawns while White hunts for kingside initiative."
  },
  {
    id: "french",
    name: "French Defense",
    eco: "C00",
    presetMoves: [],
    bookLine: [
      { san: "e4", note: "Control d5 and f5." },
      { san: "e6", note: "Prepare ...d5 with solid pawn support." },
      { san: "d4", note: "Seize the full pawn center." },
      { san: "d5", note: "Challenge e4 immediately." },
      { san: "Nc3", note: "Defend e4 while developing toward the center." },
      { san: "Nf6", note: "Add pressure against White's e4 pawn." }
    ],
    ideas: "Rock-solid central chain; Black strikes the base of White's chain with ...c5."
  },
  {
    id: "caro-kann",
    name: "Caro-Kann Defense",
    eco: "B10",
    presetMoves: [],
    bookLine: [
      { san: "e4", note: "Claim central space." },
      { san: "c6", note: "Support ...d5 without blocking the light-squared bishop." },
      { san: "d4", note: "Occupy the center." },
      { san: "d5", note: "Challenge e4 solidly." },
      { san: "Nc3", note: "Protect e4 and develop." },
      { san: "dxe4", note: "Clarify the center so ...Bf5 can develop cleanly." }
    ],
    ideas: "Sound endgame pawn structure where Black's light-squared bishop develops outside the pawn chain."
  },
  {
    id: "queens-gambit",
    name: "Queen's Gambit",
    eco: "D06",
    presetMoves: [],
    bookLine: [
      { san: "d4", note: "Stake central control on the dark squares." },
      { san: "d5", note: "Meet d4 symmetrically and block e4." },
      { san: "c4", note: "Challenge Black's d5 anchor from the flank." },
      { san: "e6", note: "Decline the gambit and hold the center (QGD)." },
      { san: "Nc3", note: "Add pressure on d5 and develop smoothly." },
      { san: "Nf6", note: "Reinforce d5 and prepare kingside castling." }
    ],
    ideas: "White lures Black's d5 pawn away using c4; Black holds firm with ...e6 or ...c6."
  },
  {
    id: "london",
    name: "London System",
    eco: "D00",
    presetMoves: [],
    bookLine: [
      { san: "d4", note: "Claim central dark squares." },
      { san: "d5", note: "Control e4 and c4." },
      { san: "Bf4", note: "Develop the dark-squared bishop outside the pawn chain." },
      { san: "Nf6", note: "Develop flexibly and guard e4." },
      { san: "e3", note: "Build the solid London pyramid behind d4." },
      { san: "c5", note: "Challenge White's queenside and d4 base." }
    ],
    ideas: "Reliable universal setup: Bf4 + e3 + c3 + Nf3 gives White a harmonious structure against almost any Black reply."
  },
  {
    id: "kings-indian",
    name: "King's Indian Defense",
    eco: "E60",
    presetMoves: [],
    bookLine: [
      { san: "d4", note: "Claim central space." },
      { san: "Nf6", note: "Control e4 flexibly." },
      { san: "c4", note: "Expand across the queenside and center." },
      { san: "g6", note: "Prepare the kingside fianchetto." },
      { san: "Nc3", note: "Develop and guard e4." },
      { san: "Bg7", note: "Place the bishop on the long dark-squared diagonal." }
    ],
    ideas: "Hypermodern counterattack: Black lets White build a big center, castles quickly, and strikes back with ...e5 or ...c5."
  }
];
