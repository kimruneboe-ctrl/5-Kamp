import type { Player } from "../game/types";

type Props = {
  player: Player;
  active?: boolean;
};

export function PlayerBadge({ player, active }: Props) {
  return (
    <div className={active ? "player-badge active" : "player-badge"}>
      <div className="avatar-orb">{player.avatar.slice(0, 2).toUpperCase()}</div>
      <div>
        <strong>{player.name}</strong>
        <span>{player.score} poeng{player.isComputer ? " · computer" : ""}</span>
      </div>
    </div>
  );
}
