import { BarChart3, Crown, History, Home, Shield } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { View } from "../types/navigation";

type Props = {
  view: View;
  onNavigate: (view: View) => void;
};

const items: { view: View; label: string; icon: LucideIcon }[] = [
  { view: "home", label: "Hjem", icon: Home },
  { view: "history", label: "Historikk", icon: History },
  { view: "stats", label: "Statistikk", icon: BarChart3 },
  { view: "profile", label: "Profil", icon: Crown },
  { view: "admin", label: "Admin", icon: Shield }
];

export function BottomNav({ view, onNavigate }: Props) {
  return (
    <nav className="bottom-nav" aria-label="Hovednavigasjon">
      {items.map((item) => {
        const Icon = item.icon;
        return (
          <button
            className={view === item.view ? "nav-item active" : "nav-item"}
            key={item.view}
            onClick={() => onNavigate(item.view)}
            type="button"
            title={item.label}
          >
            <Icon size={20} />
            <span>{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
