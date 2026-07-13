import { Crown, LogIn, Play, Plus, Swords, Users } from "lucide-react";
import { useState } from "react";
import { avatars, themes } from "../data/catalog";
import { createId } from "../game/engine";
import type { Player } from "../game/types";
import type { View } from "../types/navigation";

type Props = {
  currentGame: { code: string; status: string } | null;
  onCreate: (players: Omit<Player, "hand" | "score" | "roundScores" | "roundWins" | "passCount">[], theme: string) => void;
  onNavigate: (view: View) => void;
};

export function HomePage({ currentGame, onCreate, onNavigate }: Props) {
  const [playerCount, setPlayerCount] = useState(4);
  const [theme, setTheme] = useState(themes[0].id);
  const [names, setNames] = useState(["Eirik", "Astrid", "Leif", "Sigrid"]);
  const [joinCode, setJoinCode] = useState("");
  const [computerMode, setComputerMode] = useState(true);

  function updateCount(count: number) {
    const safeCount = Math.max(3, Math.min(6, count));
    setPlayerCount(safeCount);
    setNames((current) =>
      Array.from({ length: safeCount }, (_, index) => current[index] ?? `Spiller ${index + 1}`)
    );
  }

  function create() {
    onCreate(
      names.map((name, index) => ({
        id: createId(),
        name: name.trim() || `Spiller ${index + 1}`,
        avatar: avatars[index % avatars.length].initials,
        isHost: index === 0,
        isComputer: computerMode && index > 0
      })),
      theme
    );
  }

  return (
    <section className="home-screen">
      <header className="home-hero">
        <div className="hero-copy">
          <p className="eyebrow">ᚠ ᚢ ᚦ ᚨ ᚱ ᚲ</p>
          <h1>5-Kamp</h1>
          <div className="hero-badges">
            <span>3-6 spillere</span>
            <span>CPU-test</span>
            <span>PWA</span>
          </div>
          <p>Digital kortkamp med kampkode, automatisk kortstokk og poengføring.</p>
        </div>
        <img className="app-icon hero-icon" src="/icon-1024.png" alt="5-Kamp appikon" />
      </header>

      <div className="home-quickstart">
        <button className="cta-button" type="button" onClick={create}>
          <Plus size={24} />
          Start ny kamp
        </button>
        {currentGame && (
          <button className="ghost-button" type="button" onClick={() => onNavigate(currentGame.status === "lobby" ? "lobby" : "game")}>
            <Play size={20} />
            Gjenoppta {currentGame.code}
          </button>
        )}
        <div className="quick-note">
          <Crown size={18} />
          <span>Verten oppretter kamp. Del invitasjonslenken fra lobbyen.</span>
        </div>
      </div>

      <div className="panel compact setup-panel">
        <div className="panel-title">
          <Swords size={20} />
          <h2>Spilloppsett</h2>
        </div>
        <label>
          Spillere
          <input
            type="range"
            min="3"
            max="6"
            value={playerCount}
            onChange={(event) => updateCount(Number(event.target.value))}
          />
          <strong>{playerCount}</strong>
        </label>
        <label className="toggle-row">
          <input
            type="checkbox"
            checked={computerMode}
            onChange={(event) => setComputerMode(event.target.checked)}
          />
          <span>Spill alene mot computer</span>
        </label>
        <div className="name-grid">
          {names.map((name, index) => (
            <input
              key={index}
              value={name}
              aria-label={`Spillernavn ${index + 1}`}
              onChange={(event) => setNames((current) => current.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)))}
            />
          ))}
        </div>
        <label>
          Tema
          <select value={theme} onChange={(event) => setTheme(event.target.value)}>
            {themes.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} · {item.tier}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="join-row invite-card">
        <div>
          <div className="panel-title">
            <Users size={18} />
            <h2>Bli med i kamp</h2>
          </div>
          <p>Lim inn kampkode fra verten.</p>
        </div>
        <input value={joinCode} placeholder="Spillkode" onChange={(event) => setJoinCode(event.target.value.toUpperCase())} />
        <button
          type="button"
          className="steel-button"
          onClick={() => {
            if (currentGame?.code === joinCode.trim().toUpperCase()) {
              onNavigate(currentGame.status === "lobby" ? "lobby" : "game");
            }
          }}
        >
          <LogIn size={18} />
          Bli med
        </button>
      </div>
    </section>
  );
}
