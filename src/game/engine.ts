import type { Card, GameState, KampRound, PlayedCard, Player, Rank, RoundKind, SevensBoard, Suit } from "./types";

import type { RoundSummary } from "./types";

const suits: Suit[] = ["spar", "hjerter", "ruter", "klover"];
const ranks: Rank[] = ["A", "K", "Q", "J", "10", "9", "8", "7", "6", "5", "4", "3", "2"];
const rankValues: Record<Rank, number> = {
  A: 14,
  K: 13,
  Q: 12,
  J: 11,
  "10": 10,
  "9": 9,
  "8": 8,
  "7": 7,
  "6": 6,
  "5": 5,
  "4": 4,
  "3": 3,
  "2": 2
};

const removeOrder: Array<[Suit, Rank]> = [
  ["hjerter", "2"],
  ["ruter", "2"],
  ["klover", "2"],
  ["spar", "2"],
  ["hjerter", "3"],
  ["ruter", "3"],
  ["klover", "3"],
  ["spar", "3"]
];

export const rounds: KampRound[] = [
  { index: 0, title: "Unngå Kløver", rule: "Følg farge. Hver kløver du tar gir -1.", kind: "avoid-clubs", complete: false },
  { index: 1, title: "Unngå Damer", rule: "Følg farge. Hver dame du tar gir -4.", kind: "avoid-queens", complete: false },
  { index: 2, title: "Kabal", rule: "Legg 7-ere og bygg rekker. Pass er bare lov uten gyldig trekk.", kind: "sevens", complete: false },
  { index: 3, title: "Unngå Stikk", rule: "Følg farge. Hvert stikk du tar gir -1.", kind: "avoid-tricks", complete: false },
  { index: 4, title: "Høyeste Stikk", rule: "Følg farge. Hvert stikk du tar gir +1.", kind: "high-tricks", complete: false }
];

export function createDeck(): Card[] {
  return suits.flatMap((suit) =>
    ranks.map((rank) => ({
      id: `${suit}-${rank}`,
      suit,
      rank,
      value: rankValues[rank]
    }))
  );
}

export function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  crypto.getRandomValues(new Uint32Array(copy.length)).forEach((random, index) => {
    const swapIndex = random % (index + 1);
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  });
  return copy;
}

export function createGame(players: Omit<Player, "hand" | "score" | "roundScores" | "roundWins" | "passCount">[], theme: string): GameState {
  const seatedPlayers = players.map((player) => ({
    ...player,
    hand: [] as Card[],
    score: 0,
    roundScores: [0, 0, 0, 0, 0],
    roundWins: 0,
    passCount: 0
  }));

  return {
    id: createId(),
    code: createGameCode(),
    status: "lobby",
    theme,
    players: seatedPlayers,
    deck: [],
    removedCards: [],
    discard: [],
    rounds: rounds.map((round) => ({ ...round })),
    activeRound: 0,
    activePlayer: 0,
    dealerIndex: 0,
    trickStarterIndex: 0,
    currentTrickOrder: [],
    sevensBoard: {},
    lastTrick: []
  };
}

export function startGame(game: GameState): GameState {
  return dealRound({
    ...game,
    status: "active",
    startedAt: game.startedAt ?? new Date().toISOString(),
    activeRound: 0,
    rounds: rounds.map((round) => ({ ...round })),
    players: game.players.map((player) => ({
      ...player,
      score: 0,
      roundScores: [0, 0, 0, 0, 0],
      roundWins: 0,
      passCount: 0
    }))
  });
}

export function playCard(game: GameState, playerId: string, cardId: string): GameState {
  if (game.status !== "active") return game;
  if (game.pendingTrick) return game;
  if (game.pendingRoundSummary) return game;
  const playerIndex = game.players.findIndex((player) => player.id === playerId);
  if (playerIndex !== game.activePlayer) return game;
  const round = game.rounds[game.activeRound];
  if (round.kind === "sevens") return playSevensCard(game, playerIndex, cardId);
  return playTrickCard(game, playerIndex, cardId);
}

export function passTurn(game: GameState, playerId: string): GameState {
  if (game.status !== "active") return game;
  if (game.pendingTrick) return game;
  if (game.pendingRoundSummary) return game;
  const round = game.rounds[game.activeRound];
  if (round.kind !== "sevens") return game;
  const playerIndex = game.players.findIndex((player) => player.id === playerId);
  if (playerIndex !== game.activePlayer) return game;
  const player = game.players[playerIndex];
  if (getValidCards(game, player).length > 0) return game;

  const players = updatePlayerScore(game.players, player.id, game.activeRound, -1, (candidate) => ({
    ...candidate,
    passCount: candidate.passCount + 1
  }));
  return { ...game, players, activePlayer: nextPlayerIndex(game, playerIndex), roundResult: `${player.name} passet (-1).` };
}

export function getValidCards(game: GameState, player: Player): Card[] {
  if (game.status !== "active") return [];
  if (game.pendingTrick) return [];
  if (game.pendingRoundSummary) return [];
  const round = game.rounds[game.activeRound];
  if (round.kind === "sevens") return player.hand.filter((card) => canPlaySevensCard(game, card));
  if (!game.leadSuit) {
    if (round.kind === "avoid-clubs" && game.discard.length === 0) {
      const nonClubs = player.hand.filter((card) => card.suit !== "klover");
      return nonClubs.length > 0 ? nonClubs : player.hand;
    }
    return player.hand;
  }
  const suited = player.hand.filter((card) => card.suit === game.leadSuit);
  return suited.length > 0 ? suited : player.hand;
}

export function canPass(game: GameState, player: Player) {
  return game.rounds[game.activeRound]?.kind === "sevens" && getValidCards(game, player).length === 0;
}

export function clearPendingTrick(game: GameState): GameState {
  if (!game.pendingTrick) return game;
  if (game.pendingTrick.roundComplete) {
    const pendingRoundSummary = buildRoundSummary(game, game.pendingTrick.message);
    return {
      ...game,
      pendingTrick: undefined,
      leadSuit: undefined,
      pendingRoundSummary,
      roundResult: `${pendingRoundSummary.title} ferdig. ${pendingRoundSummary.winnerName} vant runden.`
    };
  }
  const winnerIndex = game.players.findIndex((player) => player.id === game.pendingTrick?.winnerId);
  return {
    ...game,
    activePlayer: winnerIndex >= 0 ? winnerIndex : game.activePlayer,
    trickStarterIndex: winnerIndex >= 0 ? winnerIndex : game.trickStarterIndex,
    currentTrickOrder: winnerIndex >= 0 ? buildClockwiseOrder(game.players.length, winnerIndex) : game.currentTrickOrder,
    pendingTrick: undefined,
    leadSuit: undefined,
    roundResult: game.pendingTrick.message
  };
}

export function clearRoundSummary(game: GameState): GameState {
  if (!game.pendingRoundSummary) return game;
  return finishRound({
    ...game,
    pendingRoundSummary: undefined,
    roundResult: `${game.pendingRoundSummary.winnerName} vant ${game.pendingRoundSummary.title}.`
  });
}

export function chooseComputerCard(game: GameState, player: Player): Card | null {
  const validCards = getValidCards(game, player);
  if (validCards.length === 0) return null;
  const round = game.rounds[game.activeRound];
  if (round.kind === "sevens") return chooseSevensCard(validCards);
  if (round.kind === "high-tricks") return [...validCards].sort((a, b) => b.value - a.value)[0];
  return [...validCards].sort((a, b) => penaltyValue(a, round.kind) - penaltyValue(b, round.kind) || a.value - b.value)[0];
}

export function topPlayers(players: Player[]) {
  return [...players].sort((a, b) => b.score - a.score).slice(0, 3);
}

export function getNextClockwisePlayerIndex(game: GameState, currentIndex: number) {
  return nextClockwiseIndex(game.players.length, currentIndex);
}

function playTrickCard(game: GameState, playerIndex: number, cardId: string): GameState {
  const players = clonePlayers(game.players);
  const player = players[playerIndex];
  const card = player.hand.find((candidate) => candidate.id === cardId);
  if (!card || !getValidCards(game, game.players[playerIndex]).some((candidate) => candidate.id === cardId)) return game;

  player.hand = player.hand.filter((candidate) => candidate.id !== cardId);
  const leadSuit = game.leadSuit ?? card.suit;
  const trickStarterIndex = game.leadSuit ? game.trickStarterIndex : playerIndex;
  const currentTrickOrder =
    game.leadSuit && game.currentTrickOrder.length > 0 ? game.currentTrickOrder : buildClockwiseOrder(players.length, playerIndex);
  const discard = [...game.discard, { card, playerId: player.id }];
  const currentTrick = discard.slice(-(discard.length % players.length || players.length));
  const expectedOrder = currentTrickOrder.slice(0, currentTrick.length);
  const actualOrder = currentTrick.map((play) => players.findIndex((candidate) => candidate.id === play.playerId));
  if (!actualOrder.every((index, orderIndex) => index === expectedOrder[orderIndex])) return game;
  const trickComplete = currentTrick.length === players.length;

  if (!trickComplete) {
    return {
      ...game,
      players: sortPlayerHands(players),
      discard,
      leadSuit,
      trickStarterIndex,
      currentTrickOrder,
      activePlayer: nextClockwiseIndex(players.length, playerIndex)
    };
  }

  const winnerPlay = selectTrickWinner(currentTrick, leadSuit);
  const round = game.rounds[game.activeRound];
  const roundPoints = scoreTrick(currentTrick, round.kind);
  const scoredPlayers = updatePlayerScore(players, winnerPlay.playerId, game.activeRound, roundPoints, (candidate) => ({
    ...candidate,
    roundWins: candidate.roundWins + 1
  }));
  const winnerIndex = scoredPlayers.findIndex((candidate) => candidate.id === winnerPlay.playerId);
  const roundFinished = scoredPlayers.every((candidate) => candidate.hand.length === 0) || shouldEndRoundEarly({ ...game, discard }, round.kind);

  const message = `${scoredPlayers[winnerIndex].name} tok stikket (${roundPoints} poeng).`;

  if (!roundFinished) {
    return {
      ...game,
      players: sortPlayerHands(scoredPlayers),
      discard,
      lastTrick: currentTrick,
      trickStarterIndex,
      currentTrickOrder,
      pendingTrick: {
        winnerId: winnerPlay.playerId,
        winnerCardId: winnerPlay.card.id,
        winnerCardLabel: formatCard(winnerPlay.card),
        points: roundPoints,
        message
      },
      roundResult: `${message} Neste stikk starter om 4 sekunder.`
    };
  }

  const finalMessage = scoredPlayers.every((candidate) => candidate.hand.length === 0)
    ? `${scoredPlayers[winnerIndex].name} tok siste stikk.`
    : `${scoredPlayers[winnerIndex].name} tok stikket. Alle poengkort i runden er tatt.`;
  return {
    ...game,
    players: sortPlayerHands(scoredPlayers),
    discard,
    lastTrick: currentTrick,
    trickStarterIndex,
    currentTrickOrder,
    pendingTrick: {
      winnerId: winnerPlay.playerId,
      winnerCardId: winnerPlay.card.id,
      winnerCardLabel: formatCard(winnerPlay.card),
      points: roundPoints,
      message: finalMessage,
      roundComplete: true
    },
    activePlayer: winnerIndex,
    roundResult: `${finalMessage} Neste runde deles ut om 4 sekunder.`
  };
}

function playSevensCard(game: GameState, playerIndex: number, cardId: string): GameState {
  const players = clonePlayers(game.players);
  const player = players[playerIndex];
  const card = player.hand.find((candidate) => candidate.id === cardId);
  if (!card || !canPlaySevensCard(game, card)) return game;

  player.hand = player.hand.filter((candidate) => candidate.id !== cardId);
  const sevensBoard = placeSevensCard(game.sevensBoard, card);
  const discard = [...game.discard, { card, playerId: player.id }];
  if (player.hand.length > 0) {
    return {
      ...game,
      players: sortPlayerHands(players),
      discard,
      sevensBoard,
      activePlayer: nextPlayerIndex(game, playerIndex),
      roundResult: `${player.name} la ${card.rank} ${card.suit}.`
    };
  }

  const scoredPlayers = players.map((candidate) =>
    candidate.id === player.id ? candidate : addRoundPoints(candidate, game.activeRound, -candidate.hand.length)
  );
  const completedGame = {
    ...game,
    players: scoredPlayers,
    discard,
    sevensBoard,
    roundResult: `${player.name} gikk ut i Kabal. Kort igjen er trukket fra.`
  };
  return {
    ...completedGame,
    pendingRoundSummary: buildRoundSummary(completedGame, `${player.name} gikk ut i Kabal. Kort igjen er trukket fra.`)
  };
}

function finishRound(game: GameState): GameState {
  const rounds = game.rounds.map((round, index) => (index === game.activeRound ? { ...round, complete: true } : round));
  const nextRound = game.activeRound + 1;
  if (nextRound >= rounds.length) {
    return { ...game, rounds, status: "complete", endedAt: new Date().toISOString() };
  }
  return dealRound({
    ...game,
    rounds,
    activeRound: nextRound,
    discard: [],
    leadSuit: undefined,
    sevensBoard: {},
    pendingTrick: undefined,
    pendingRoundSummary: undefined,
    lastTrick: [],
    dealerIndex: nextClockwiseIndex(game.players.length, game.dealerIndex)
  });
}

function dealRound(game: GameState): GameState {
  const { deck, removedCards } = prepareDeckForPlayers(game.players.length);
  const shuffled = shuffle(deck);
  const players = game.players.map((player) => ({ ...player, hand: [] as Card[], passCount: 0 }));
  const roundStarterIndex = nextClockwiseIndex(game.players.length, game.dealerIndex);
  shuffled.forEach((card, index) => {
    players[index % players.length].hand.push(card);
  });

  return {
    ...game,
    players: players.map((player) => ({ ...player, hand: sortCards(player.hand) })),
    deck: shuffled,
    removedCards,
    discard: [],
    leadSuit: undefined,
    sevensBoard: {},
    pendingTrick: undefined,
    pendingRoundSummary: undefined,
    lastTrick: [],
    trickStarterIndex: roundStarterIndex,
    currentTrickOrder: buildClockwiseOrder(game.players.length, roundStarterIndex),
    activePlayer: roundStarterIndex,
    roundResult: game.roundResult
  };
}

function shouldEndRoundEarly(game: GameState, kind: RoundKind) {
  if (kind === "avoid-queens") {
    return game.discard.filter((play) => play.card.rank === "Q").length >= 4;
  }
  if (kind === "avoid-clubs") {
    const clubsInPlay = game.deck.filter((card) => card.suit === "klover").length;
    const clubsTaken = game.discard.filter((play) => play.card.suit === "klover").length;
    return clubsInPlay > 0 && clubsTaken >= clubsInPlay;
  }
  return false;
}

function buildRoundSummary(game: GameState, message: string): RoundSummary {
  const round = game.rounds[game.activeRound];
  const roundScores = game.players
    .map((player) => ({
      playerId: player.id,
      name: player.name,
      points: player.roundScores[game.activeRound] ?? 0,
      total: player.score
    }))
    .sort((a, b) => b.points - a.points || b.total - a.total);
  const winner = roundScores[0];
  return {
    roundIndex: game.activeRound,
    title: round.title,
    winnerId: winner.playerId,
    winnerName: winner.name,
    message,
    roundScores
  };
}

function prepareDeckForPlayers(playerCount: number) {
  let deck = createDeck();
  const removedCards: Card[] = [];
  let removeIndex = 0;
  while (deck.length % playerCount !== 0 && removeIndex < removeOrder.length) {
    const [suit, rank] = removeOrder[removeIndex];
    const card = deck.find((candidate) => candidate.suit === suit && candidate.rank === rank);
    if (card) {
      removedCards.push(card);
      deck = deck.filter((candidate) => candidate.id !== card.id);
    }
    removeIndex += 1;
  }
  return { deck, removedCards };
}

function canPlaySevensCard(game: GameState, card: Card) {
  if (card.rank === "7") return true;
  const row = game.sevensBoard[card.suit];
  if (!row) return false;
  if (card.rank === "A" && row.low === 2) return true;
  if (card.rank !== "A" && card.value === row.high + 1 && card.value < rankValues.A) return true;
  return card.value === row.low - 1 && card.value >= lowestCardValueForSuit(game, card.suit);
}

function placeSevensCard(board: SevensBoard, card: Card): SevensBoard {
  const current = board[card.suit] ?? { low: 7, high: 7 };
  if (card.rank === "A") return { ...board, [card.suit]: { ...current, low: 1 } };
  return { ...board, [card.suit]: { low: Math.min(current.low, card.value), high: Math.max(current.high, card.value) } };
}

function lowestCardValueForSuit(game: GameState, suit: Suit) {
  return game.removedCards.some((card) => card.suit === suit && card.rank === "2") ? 3 : 2;
}

function selectTrickWinner(plays: PlayedCard[], leadSuit: Suit) {
  return plays.filter((play) => play.card.suit === leadSuit).sort((a, b) => b.card.value - a.card.value)[0];
}

function scoreTrick(plays: PlayedCard[], kind: RoundKind) {
  if (kind === "avoid-clubs") return -plays.filter((play) => play.card.suit === "klover").length;
  if (kind === "avoid-queens") return -4 * plays.filter((play) => play.card.rank === "Q").length;
  if (kind === "avoid-tricks") return -1;
  if (kind === "high-tricks") return 1;
  return 0;
}

function penaltyValue(card: Card, kind: RoundKind) {
  if (kind === "avoid-clubs") return card.suit === "klover" ? 20 + card.value : card.value;
  if (kind === "avoid-queens") return card.rank === "Q" ? 40 : card.value;
  return card.value;
}

function chooseSevensCard(cards: Card[]) {
  return [...cards].sort((a, b) => (a.rank === "7" ? -1 : 0) - (b.rank === "7" ? -1 : 0) || a.value - b.value)[0];
}

function updatePlayerScore(players: Player[], playerId: string, roundIndex: number, points: number, mapWinner?: (player: Player) => Player) {
  return players.map((player) => {
    if (player.id !== playerId) return player;
    const mapped = mapWinner ? mapWinner(player) : player;
    return addRoundPoints(mapped, roundIndex, points);
  });
}

function addRoundPoints(player: Player, roundIndex: number, points: number): Player {
  const roundScores = [...player.roundScores];
  roundScores[roundIndex] = (roundScores[roundIndex] ?? 0) + points;
  return { ...player, roundScores, score: roundScores.reduce((sum, value) => sum + value, 0) };
}

function nextPlayerIndex(game: GameState, currentIndex: number) {
  return nextClockwiseIndex(game.players.length, currentIndex);
}

function nextClockwiseIndex(playerCount: number, currentIndex: number) {
  const order = getClockwiseSeatOrder(playerCount);
  const seatPosition = order.indexOf(currentIndex);
  if (seatPosition === -1) return (currentIndex + 1) % playerCount;
  return order[(seatPosition + 1) % order.length];
}

function buildClockwiseOrder(playerCount: number, startIndex: number) {
  const order = getClockwiseSeatOrder(playerCount);
  const startPosition = order.indexOf(startIndex);
  if (startPosition === -1) return Array.from({ length: playerCount }, (_, offset) => (startIndex + offset) % playerCount);
  return Array.from({ length: playerCount }, (_, offset) => order[(startPosition + offset) % playerCount]);
}

function getClockwiseSeatOrder(playerCount: number) {
  return Array.from({ length: playerCount }, (_, index) => index);
}

function sortCards(cards: Card[]) {
  const suitOrder: Record<Suit, number> = { spar: 0, hjerter: 1, ruter: 2, klover: 3 };
  return [...cards].sort((a, b) => suitOrder[a.suit] - suitOrder[b.suit] || a.value - b.value);
}

function sortPlayerHands(players: Player[]) {
  return players.map((player) => ({ ...player, hand: sortCards(player.hand) }));
}

function formatCard(card: Card) {
  return `${suitSymbol(card.suit)} ${rankName(card.rank)}`;
}

function suitSymbol(suit: Suit) {
  if (suit === "spar") return "♠";
  if (suit === "hjerter") return "♥";
  if (suit === "ruter") return "♦";
  return "♣";
}

function rankName(rank: Rank) {
  if (rank === "A") return "Ess";
  if (rank === "K") return "Konge";
  if (rank === "Q") return "Dame";
  if (rank === "J") return "Knekt";
  return rank;
}

function clonePlayers(players: Player[]) {
  return players.map((player) => ({ ...player, hand: [...player.hand], roundScores: [...player.roundScores] }));
}

function createGameCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from(crypto.getRandomValues(new Uint8Array(5)))
    .map((value) => alphabet[value % alphabet.length])
    .join("");
}

export function createId() {
  const browserCrypto = globalThis.crypto as Crypto & { randomUUID?: () => string };
  if (browserCrypto.randomUUID) return browserCrypto.randomUUID();
  const values = browserCrypto.getRandomValues(new Uint8Array(16));
  values[6] = (values[6] & 0x0f) | 0x40;
  values[8] = (values[8] & 0x3f) | 0x80;
  const hex = Array.from(values, (value) => value.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
