import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Home, Trophy } from "lucide-react";
import { CardView } from "../components/CardView";
import { PlayerBadge } from "../components/PlayerBadge";
import {
  canPass,
  chooseComputerCard,
  clearPendingTrick,
  clearRoundSummary,
  getNextClockwisePlayerIndex,
  getValidCards,
  passTurn,
  playCard,
  topPlayers
} from "../game/engine";
import type { Card, GameState, Rank, RoundKind, Suit } from "../game/types";

type Props = {
  game: GameState;
  onGameChange: (game: GameState) => void;
  onHome: () => void;
};

export function GamePage({ game, onGameChange, onHome }: Props) {
  const tableRef = useRef<HTMLDivElement | null>(null);
  const handRef = useRef<HTMLDivElement | null>(null);
  const seatRefs = useRef<Array<HTMLDivElement | null>>([]);
  const [cardZone, setCardZone] = useState({ x: 50, y: 50 });
  const activePlayer = game.players[game.activePlayer];
  const humanPlayer = game.players.find((player) => !player.isComputer) ?? game.players[0];
  const round = game.rounds[game.activeRound];
  const isSevensRound = round.kind === "sevens";
  const trickResultLabel = round.kind === "high-tricks" ? "STIKK VUNNET AV" : "STIKK TATT AV";
  const winners = topPlayers(game.players);
  const standings = [...game.players].sort((a, b) => b.score - a.score);
  const isComputerTurn = game.status === "active" && activePlayer?.isComputer;
  const trickSize = game.players.length;
  const cardsInCurrentTrick = game.discard.length % trickSize;
  const visiblePlays =
    !isSevensRound && cardsInCurrentTrick === 0 && game.discard.length > 0
      ? game.discard.slice(-trickSize)
      : isSevensRound
        ? []
        : game.discard.slice(-cardsInCurrentTrick);
  const tableLabel = cardsInCurrentTrick === 0 && game.discard.length > 0 ? "Siste stikk" : "På bordet";
  const canPlay = game.status === "active" && activePlayer.id === humanPlayer.id && !game.pendingRoundSummary;
  const validHumanCards = getValidCards(game, humanPlayer);
  const validHumanCardIds = new Set(validHumanCards.map((card) => card.id));
  const humanCanPass = canPlay && canPass(game, humanPlayer);
  const shouldPrioritizeLegalCards = canPlay && round.kind !== "sevens" && Boolean(game.leadSuit);
  const visibleHand = shouldPrioritizeLegalCards
    ? [...humanPlayer.hand].sort((a, b) => Number(validHumanCardIds.has(b.id)) - Number(validHumanCardIds.has(a.id)))
    : humanPlayer.hand;
  const hasLeadSuit = game.leadSuit ? humanPlayer.hand.some((card) => card.suit === game.leadSuit) : false;
  const handHint = getHandHint(canPlay, round.kind, game.leadSuit, hasLeadSuit);
  const hasStartedSevens = Object.keys(game.sevensBoard).length > 0;
  const sevensRows = round.kind === "sevens" && hasStartedSevens ? getSevensRows(game, validHumanCardIds) : [];
  const dealer = game.players[game.dealerIndex];
  const startPlayer = game.players[game.trickStarterIndex];
  const activeSuit = game.leadSuit ? suitLabels[game.leadSuit] : null;
  const pendingWinner = game.pendingTrick ? game.players.find((player) => player.id === game.pendingTrick?.winnerId) : null;
  const nextPlayer = game.pendingTrick
    ? pendingWinner
    : game.players[getNextClockwisePlayerIndex(game, game.activePlayer)];
  const seatPositions = getSeatPositions(game.players.length);

  useLayoutEffect(() => {
    function updateCardZone() {
      const table = tableRef.current;
      if (!table) return;
      const tableRect = table.getBoundingClientRect();
      const centerX = tableRect.left + tableRect.width / 2;
      const centerY = tableRect.top + tableRect.height / 2;
      let top = tableRect.top + tableRect.height * 0.18;
      let bottom = tableRect.top + tableRect.height * 0.82;
      let left = tableRect.left + tableRect.width * 0.16;
      let right = tableRect.left + tableRect.width * 0.84;

      seatRefs.current.forEach((seat) => {
        if (!seat) return;
        const rect = seat.getBoundingClientRect();
        if (rect.bottom <= centerY) top = Math.max(top, rect.bottom + 14);
        if (rect.top >= centerY) bottom = Math.min(bottom, rect.top - 14);
        if (rect.right <= centerX) left = Math.max(left, rect.right + 14);
        if (rect.left >= centerX) right = Math.min(right, rect.left - 14);
      });

      if (bottom <= top || right <= left) {
        setCardZone({ x: 50, y: 50 });
        return;
      }

      const next = {
        x: (((left + right) / 2 - tableRect.left) / tableRect.width) * 100,
        y: (((top + bottom) / 2 - tableRect.top) / tableRect.height) * 100
      };
      setCardZone((current) =>
        Math.abs(current.x - next.x) > 0.5 || Math.abs(current.y - next.y) > 0.5 ? next : current
      );
    }

    updateCardZone();
    window.addEventListener("resize", updateCardZone);
    return () => window.removeEventListener("resize", updateCardZone);
  }, [game.players.length, visiblePlays.length, sevensRows.length]);

  useEffect(() => {
    if (game.pendingTrick || game.pendingRoundSummary) return undefined;
    if (!isComputerTurn || !activePlayer) return undefined;
    const timer = window.setTimeout(() => {
      const card = chooseComputerCard(game, activePlayer);
      if (card) {
        onGameChange(playCard(game, activePlayer.id, card.id));
      } else {
        onGameChange(passTurn(game, activePlayer.id));
      }
    }, 750);

    return () => window.clearTimeout(timer);
  }, [activePlayer, game, isComputerTurn, onGameChange]);

  useEffect(() => {
    if (!game.pendingTrick) return undefined;
    const timer = window.setTimeout(() => {
      onGameChange(clearPendingTrick(game));
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [game, onGameChange]);

  useEffect(() => {
    if (!game.pendingRoundSummary) return undefined;
    const timer = window.setTimeout(() => {
      onGameChange(clearRoundSummary(game));
    }, 5200);

    return () => window.clearTimeout(timer);
  }, [game, onGameChange]);

  useEffect(() => {
    const target = game.pendingTrick || game.pendingRoundSummary ? tableRef.current : canPlay ? handRef.current : null;
    if (!target) return undefined;
    const timer = window.setTimeout(() => {
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      target.scrollIntoView({
        behavior: reducedMotion ? "auto" : "smooth",
        block: game.pendingTrick || game.pendingRoundSummary ? "center" : "nearest"
      });
    }, 80);

    return () => window.clearTimeout(timer);
  }, [activePlayer?.id, canPlay, game.pendingRoundSummary, game.pendingTrick]);

  return (
    <section className="game-screen">
      <header className="game-top">
        <button className="icon-button" onClick={onHome} type="button" title="Hjem">
          <Home size={20} />
        </button>
        <div>
          <p className="eyebrow">Runde {game.activeRound + 1} av 5</p>
          <h1>{round.title}</h1>
          <span>{round.rule}</span>
        </div>
        <div className="round-chip">{game.code}</div>
      </header>

      <div
        className={[
          "poker-table",
          `player-count-${game.players.length}`,
          game.pendingTrick ? "result-focus" : "",
          game.pendingRoundSummary ? "summary-focus" : ""
        ]
          .filter(Boolean)
          .join(" ")}
        aria-label={tableLabel}
        ref={tableRef}
        style={{ "--card-zone-x": `${cardZone.x}%`, "--card-zone-y": `${cardZone.y}%` } as CSSProperties}
      >
        <div className="table-round-info">
          <span>Runde {game.activeRound + 1} av 5</span>
          <strong>{round.title}</strong>
        </div>
        {!isSevensRound && (
          <div className="table-center">
            <span>{tableLabel}</span>
            <strong>{visiblePlays.length}/{trickSize}</strong>
          </div>
        )}
        {activeSuit && (
          <div className={`active-suit-panel ${game.leadSuit}`}>
            <span>AKTIV SORT</span>
            <strong>{activeSuit}</strong>
          </div>
        )}
        {game.pendingTrick && pendingWinner && (
          <div className="trick-winner-banner">
            <span>{trickResultLabel}</span>
            <strong>{pendingWinner.name}</strong>
            <em>{game.pendingTrick.winnerCardLabel} tok stikket</em>
          </div>
        )}
        {game.pendingRoundSummary && (
          <div className="round-summary-panel">
            <span>RUNDE FERDIG</span>
            <h2>{game.pendingRoundSummary.title}</h2>
            <strong>{game.pendingRoundSummary.winnerName} vant runden</strong>
            <p>{game.pendingRoundSummary.message}</p>
            <div>
              {game.pendingRoundSummary.roundScores.map((score) => (
                <small key={score.playerId}>
                  {score.name}: {score.points} / totalt {score.total}
                </small>
              ))}
            </div>
          </div>
        )}
        {visiblePlays.length > 0 && (
          <div className="played-card-pile">
            {visiblePlays.map((play) => {
              const player = game.players.find((candidate) => candidate.id === play.playerId);
              return (
                <div className="table-play" key={`${play.playerId}-${play.card.id}`}>
                  <CardView card={play.card} compact winning={play.card.id === game.pendingTrick?.winnerCardId} />
                  <span>{player?.name}</span>
                </div>
              );
            })}
          </div>
        )}
        {sevensRows.length > 0 && (
          <div className="sevens-board">
            {sevensRows.filter((row) => row.slots.some((slot) => slot.card || slot.cards?.length)).map((row) => (
              <div className="sevens-column" key={row.suit}>
                <div>
                  {row.slots.map((slot) => (
                    <div className={slot.className} key={slot.id}>
                      {slot.cards ? (
                        <div className="sevens-card-stack">
                          {slot.cards.map((card) => (
                            <CardView card={card} compact key={card.id} />
                          ))}
                        </div>
                      ) : (
                        slot.card && <CardView card={slot.card} compact />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
        {game.players.map((player, index) => {
          const play = visiblePlays.find((item) => item.playerId === player.id);
          const seatPosition = seatPositions[index];
          return (
            <div
              className={[
                "table-seat",
                player.id === humanPlayer.id ? "human-seat" : "",
                player.id === activePlayer.id ? "active" : "",
                player.id === game.pendingTrick?.winnerId ? "trick-winner" : ""
              ]
                .filter(Boolean)
                .join(" ")}
              key={player.id}
              ref={(element) => {
                seatRefs.current[index] = element;
              }}
              style={{ "--seat-x": `${seatPosition.x}%`, "--seat-y": `${seatPosition.y}%` } as CSSProperties}
            >
              <div className="seat-avatar">
                <span>{player.avatar.slice(0, 2).toUpperCase()}</span>
                {player.id === activePlayer.id && <em>DIN TUR</em>}
                {index === game.dealerIndex && <small>D</small>}
              </div>
              <div className="seat-nameplate">
                <strong>{player.name}</strong>
                <span>{player.score} poeng{player.isComputer ? " · CPU" : " · Du"}</span>
              </div>
              <div className="seat-card-slot">
                <em>{play ? "Lagt på bordet" : player.id === activePlayer.id ? "Har tur" : "Klar"}</em>
              </div>
            </div>
          );
        })}
      </div>

      <div className="hand-header">
        <span>Din hånd</span>
        {handHint && <strong>{handHint}</strong>}
        {humanCanPass && (
          <button className="pass-button" type="button" onClick={() => onGameChange(passTurn(game, humanPlayer.id))}>
            PASS
          </button>
        )}
        {!canPlay && game.status === "active" && !handHint && <strong>Vent på tur</strong>}
      </div>

      <div className="card-hand" aria-label="Din hånd" ref={handRef}>
        {visibleHand.map((card) => (
          <CardView
            key={card.id}
            card={card}
            disabled={!canPlay || !validHumanCardIds.has(card.id)}
            legal={canPlay && validHumanCardIds.has(card.id)}
            onClick={() => onGameChange(playCard(game, humanPlayer.id, card.id))}
          />
        ))}
      </div>

      {game.status === "complete" && (
        <div className="victory-panel">
          <Trophy size={28} />
          <h2>{winners[0]?.name} vant kampen</h2>
          <button className="cta-button" type="button" onClick={onHome}>
            Ferdig
          </button>
        </div>
      )}

      <aside className="scoreboard">
        <div className="panel-title">
          <Trophy size={18} />
          <h2>Poengtavle</h2>
        </div>
        <div className="score-head">
          <span>#</span>
          <strong>Spiller</strong>
          <small>Runde</small>
          <em>Total</em>
        </div>
        {standings.map((player, index) => (
          <div className="score-row" key={player.id}>
            <span>{index + 1}</span>
            <strong>{player.name}</strong>
            <small>{player.roundScores[game.activeRound] ?? 0}</small>
            <em>{player.score}</em>
          </div>
        ))}
      </aside>
    </section>
  );
}

function getHandHint(canPlay: boolean, roundKind: RoundKind, leadSuit: Suit | undefined, hasLeadSuit: boolean) {
  if (!canPlay || roundKind === "sevens" || !leadSuit) return "";
  if (!hasLeadSuit) return `Ingen ${plainSuitLabels[leadSuit]} - spill valgfritt`;
  return `Følg ${plainSuitLabels[leadSuit]} - spill markert kort`;
}

function getSeatPositions(playerCount: number) {
  const radiusX = playerCount <= 4 ? 37 : 42;
  const radiusY = playerCount <= 4 ? 32 : 37;
  return Array.from({ length: playerCount }, (_, index) => {
    const angle = -90 + (360 / playerCount) * index;
    const radians = (angle * Math.PI) / 180;
    return {
      x: 50 + Math.cos(radians) * radiusX,
      y: 55 + Math.sin(radians) * radiusY
    };
  });
}

const rankByValue: Record<number, Rank> = {
  1: "A",
  14: "A",
  13: "K",
  12: "Q",
  11: "J",
  10: "10",
  9: "9",
  8: "8",
  7: "7",
  6: "6",
  5: "5",
  4: "4",
  3: "3",
  2: "2"
};

const suitLabels: Record<Suit, string> = {
  spar: "♠ Spar",
  hjerter: "♥ Hjerter",
  ruter: "♦ Ruter",
  klover: "♣ Kløver"
};

const plainSuitLabels: Record<Suit, string> = {
  spar: "spar",
  hjerter: "hjerter",
  ruter: "ruter",
  klover: "kløver"
};

const sevensColumnSuits: Suit[] = ["spar", "hjerter", "ruter", "klover"];

type SevensSlot = {
  id: string;
  rank: string;
  card: Card | null;
  cards?: Card[];
  legal: boolean;
  className: string;
};

function getSevensRows(game: GameState, validHumanCardIds: Set<string>) {
  return sevensColumnSuits.map((suit) => {
    const row = game.sevensBoard[suit];
    const lowLimit = game.removedCards.some((card) => card.suit === suit && card.rank === "2") ? 3 : 2;
    const missingUpValue = row && row.high < 14 ? row.high + 1 : null;
    const missingDownValue = row && row.low > lowLimit ? row.low - 1 : null;
    const missingUp = !row ? "7" : missingUpValue ? rankByValue[missingUpValue] : "Komplett";
    const missingDown = !row ? "7" : missingDownValue ? rankByValue[missingDownValue] : "Komplett";
    const topValue = row?.high;
    const lowValue = row?.low;
    const slots = [
      makeSevensSlot(suit, topValue && topValue > 7 ? topValue : null, "Opp", validHumanCardIds, missingUpValue),
      makeSevensSlot(suit, row ? 7 : null, "7", validHumanCardIds, row ? null : 7),
      lowValue === 1
        ? makeSevensStackSlot(suit, [2, 1])
        : makeSevensSlot(suit, lowValue && lowValue < 7 ? lowValue : null, "Ned", validHumanCardIds, missingDownValue)
    ];

    return {
      suit,
      label: suitLabels[suit],
      slots,
      missingUp,
      missingDown
    };
  });
}

function makeSevensStackSlot(suit: Suit, values: number[]): SevensSlot {
  return {
    id: `${suit}-stack-${values.join("-")}`,
    rank: values.map((value) => rankByValue[value]).join("/"),
    card: null,
    cards: values.map((value) => makeBoardCard(suit, value)),
    legal: false,
    className: "sevens-slot placed stacked"
  };
}

function makeSevensSlot(
  suit: Suit,
  value: number | null,
  placeholder: string,
  validHumanCardIds: Set<string>,
  legalValue: number | null
): SevensSlot {
  const rank = value ? rankByValue[value] : placeholder;
  const card: Card | null = value ? makeBoardCard(suit, value) : null;
  const legalRank = legalValue ? rankByValue[legalValue] : null;
  const legal = legalRank ? validHumanCardIds.has(`${suit}-${legalRank}`) : false;

  return {
    id: `${suit}-${placeholder}-${value ?? "empty"}`,
    rank,
    card,
    legal,
    className: ["sevens-slot", card ? "placed" : "", legal ? "legal-slot" : ""].filter(Boolean).join(" ")
  };
}

function makeBoardCard(suit: Suit, value: number): Card {
  return {
    id: `board-${suit}-${value}`,
    suit,
    rank: rankByValue[value],
    value: value === 1 ? 14 : value
  };
}
