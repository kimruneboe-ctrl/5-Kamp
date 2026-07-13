import { History } from "lucide-react";
import { loadHistory } from "../lib/storage";

export function HistoryPage() {
  const history = loadHistory();

  return (
    <section className="stack-screen">
      <header className="page-heading">
        <p className="eyebrow">Sagaarkiv</p>
        <h1>Historikk</h1>
      </header>
      <div className="panel-list">
        {history.length === 0 && <div className="empty-state">Ingen fullførte kamper ennå.</div>}
        {history.map((game) => {
          const winner = [...game.players].sort((a, b) => b.score - a.score)[0];
          return (
            <article className="history-card" key={game.id}>
              <History size={20} />
              <div>
                <strong>{game.code}</strong>
                <span>{winner?.name} vant med {winner?.score} poeng</span>
              </div>
              <time>{game.endedAt ? new Date(game.endedAt).toLocaleDateString("nb-NO") : "Aktiv"}</time>
            </article>
          );
        })}
      </div>
    </section>
  );
}
