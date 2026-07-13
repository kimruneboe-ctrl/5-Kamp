import { Database, ShieldCheck } from "lucide-react";
import { achievements, avatars, themes } from "../data/catalog";

export function AdminPage() {
  const rows = [
    { label: "Brukere", value: "Klar for Supabase Auth" },
    { label: "Kamper", value: "Lobby, aktiv, fullfort" },
    { label: "Prestasjoner", value: `${achievements.length} regler` },
    { label: "Avatarer", value: `${avatars.length} valg` },
    { label: "Temaer", value: `${themes.length} tema` }
  ];

  return (
    <section className="stack-screen">
      <header className="page-heading">
        <p className="eyebrow">Kontrollrom</p>
        <h1>Adminpanel</h1>
      </header>
      <div className="admin-table">
        {rows.map((row) => (
          <div className="admin-row" key={row.label}>
            <ShieldCheck size={18} />
            <strong>{row.label}</strong>
            <span>{row.value}</span>
          </div>
        ))}
      </div>
      <div className="panel compact">
        <div className="panel-title">
          <Database size={20} />
          <h2>Backend</h2>
        </div>
        <p>Supabase-migreringen oppretter profiler, kamper, spillere, runder, prestasjoner, avatarer, temaer og RLS-regler.</p>
      </div>
    </section>
  );
}
