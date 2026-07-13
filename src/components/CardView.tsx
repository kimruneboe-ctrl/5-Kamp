import type { Card } from "../game/types";

const suitSymbols = {
  spar: "♠",
  hjerter: "♥",
  ruter: "♦",
  klover: "♣"
};

type Props = {
  card: Card;
  onClick?: () => void;
  disabled?: boolean;
  compact?: boolean;
  legal?: boolean;
  winning?: boolean;
};

export function CardView({ card, onClick, disabled, compact, legal, winning }: Props) {
  const className = [
    "playing-card",
    compact ? "compact-card" : "",
    legal ? "legal-card" : "",
    winning ? "winning-card" : "",
    card.suit
  ]
    .filter(Boolean)
    .join(" ");
  const content = (
    <>
      <span>{card.rank}</span>
      <strong>{suitSymbols[card.suit]}</strong>
      <small>{card.suit}</small>
    </>
  );

  if (!onClick) {
    return (
      <div className={className} aria-label={`${card.rank} ${suitSymbols[card.suit]} ${card.suit}`}>
        {content}
      </div>
    );
  }

  return (
    <button className={className} onClick={onClick} disabled={disabled} type="button">
      {content}
    </button>
  );
}
