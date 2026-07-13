export type Suit = "spar" | "hjerter" | "ruter" | "klover";
export type Rank = "A" | "K" | "Q" | "J" | "10" | "9" | "8" | "7" | "6" | "5" | "4" | "3" | "2";

export type Card = {
  id: string;
  suit: Suit;
  rank: Rank;
  value: number;
};

export type PlayedCard = {
  card: Card;
  playerId: string;
};

export type PendingTrick = {
  winnerId: string;
  winnerCardId: string;
  winnerCardLabel: string;
  points: number;
  message: string;
  roundComplete?: boolean;
};

export type RoundSummary = {
  roundIndex: number;
  title: string;
  winnerId: string;
  winnerName: string;
  message: string;
  roundScores: Array<{
    playerId: string;
    name: string;
    points: number;
    total: number;
  }>;
};

export type RoundKind = "avoid-clubs" | "avoid-queens" | "sevens" | "avoid-tricks" | "high-tricks";

export type Player = {
  id: string;
  name: string;
  avatar: string;
  isHost?: boolean;
  isComputer?: boolean;
  hand: Card[];
  score: number;
  roundScores: number[];
  roundWins: number;
  passCount: number;
};

export type KampRound = {
  index: number;
  title: string;
  rule: string;
  kind: RoundKind;
  complete: boolean;
  winnerId?: string;
};

export type SevensBoard = Partial<Record<Suit, { low: number; high: number }>>;

export type GameState = {
  id: string;
  code: string;
  status: "lobby" | "active" | "complete";
  theme: string;
  players: Player[];
  deck: Card[];
  removedCards: Card[];
  discard: PlayedCard[];
  rounds: KampRound[];
  activeRound: number;
  activePlayer: number;
  dealerIndex: number;
  trickStarterIndex: number;
  currentTrickOrder: number[];
  leadSuit?: Suit;
  sevensBoard: SevensBoard;
  pendingTrick?: PendingTrick;
  pendingRoundSummary?: RoundSummary;
  lastTrick: PlayedCard[];
  roundResult?: string;
  startedAt?: string;
  endedAt?: string;
};
