import { BarChart3, Clock, Medal, Percent, Trophy } from "lucide-react";
import { loadHistory } from "../lib/storage";

export function StatsPage() {
  const history = loadHistory();
  const games = history.length;
  const wins = history.filter((game) => [...game.players].sort((a, b) => b.score - a.score)[0]?.isHost).length;
  const averageScore =
    games === 0 ? 0 : Math.round(history.reduce((sum, game) => sum + (game.players[0]?.score ?? 0), 0) / games);
  const winRate = games === 0 ? 0 : Math.round((wins / games) * 100);

  const stats = [
    { label: "Kamper", value: games, icon: BarChart3 },
    { label: "Seiere", value: wins, icon: Trophy },
    { label: "Topp 3", value: history.length, icon: Medal },
    { label: "Vunnet", value: `${winRate}%`, icon: Percent },
    { label: "Timer", value: Math.max(1, games * 0.4).toFixed(1), icon: Clock },
    { label: "Snitt", value: averageScore, icon: BarChart3 }
  ];

  return (
    <section className="stack-screen">
      <header className="page-heading">
        <p className="eyebrow">Runetavle</p>
        <h1>Statistikk</h1>
      </header>
      <div className="stats-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <article className="stat-card" key={stat.label}>
              <Icon size={20} />
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </article>
          );
        })}
      </div>
      <div className="chart-panel" aria-label="Resultatgraf">
        {[42, 68, 55, 86, 73, 91].map((height, index) => (
          <span key={index} style={{ height: `${height}%` }} />
        ))}
      </div>
    </section>
  );
}
