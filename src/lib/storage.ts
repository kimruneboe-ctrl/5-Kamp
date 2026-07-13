import type { GameState } from "../game/types";

const gameKey = "5kamp.currentGame";
const historyKey = "5kamp.history";

export function saveCurrentGame(game: GameState) {
  localStorage.setItem(gameKey, JSON.stringify(game));
}

export function loadCurrentGame(): GameState | null {
  const raw = localStorage.getItem(gameKey);
  if (!raw) return null;
  const game = JSON.parse(raw) as GameState;
  return isCompatibleGame(game) ? game : null;
}

export function archiveGame(game: GameState) {
  const history = loadHistory();
  localStorage.setItem(historyKey, JSON.stringify([game, ...history.filter((item) => item.id !== game.id)].slice(0, 25)));
}

export function loadHistory(): GameState[] {
  const raw = localStorage.getItem(historyKey);
  return raw ? (JSON.parse(raw) as GameState[]) : [];
}

function isCompatibleGame(game: GameState) {
  return (
    Array.isArray(game.removedCards) &&
    Array.isArray(game.lastTrick) &&
    typeof game.dealerIndex === "number" &&
    typeof game.trickStarterIndex === "number" &&
    Array.isArray(game.currentTrickOrder) &&
    Boolean(game.sevensBoard) &&
    game.rounds.every((round) => "kind" in round) &&
    game.players.every((player) => Array.isArray(player.roundScores))
  );
}
