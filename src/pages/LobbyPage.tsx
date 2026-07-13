import { ArrowLeft, Copy, Link2, Play } from "lucide-react";
import { PlayerBadge } from "../components/PlayerBadge";
import type { GameState } from "../game/types";

type Props = {
  game: GameState;
  onStart: () => void;
  onBack: () => void;
};

export function LobbyPage({ game, onStart, onBack }: Props) {
  const inviteLink = `${window.location.origin}${window.location.pathname}?kamp=${game.code}`;

  return (
    <section className="stack-screen">
      <header className="top-bar">
        <button className="icon-button" type="button" onClick={onBack} title="Tilbake">
          <ArrowLeft size={20} />
        </button>
        <div>
          <p className="eyebrow">Lobby</p>
          <h1>Kampkode {game.code}</h1>
        </div>
        <button className="icon-button" type="button" onClick={() => navigator.clipboard?.writeText(inviteLink)} title="Kopier lenke">
          <Link2 size={20} />
        </button>
      </header>

      <div className="invite-panel">
        <span>Kampkode</span>
        <strong>{game.code}</strong>
        <button className="steel-button" type="button" onClick={() => navigator.clipboard?.writeText(inviteLink)}>
          <Link2 size={18} />
          Kopier invitasjonslenke
        </button>
        <button className="ghost-button" type="button" onClick={() => navigator.clipboard?.writeText(game.code)}>
          <Copy size={18} />
          Kopier bare kode
        </button>
      </div>
      <div className="player-list">
        {game.players.map((player) => (
          <PlayerBadge key={player.id} player={player} />
        ))}
      </div>

      <button className="cta-button fixed-action" type="button" onClick={onStart}>
        <Play size={24} />
        Start kampen
      </button>
    </section>
  );
}
