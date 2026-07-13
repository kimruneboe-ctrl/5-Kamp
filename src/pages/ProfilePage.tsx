import { Lock, Medal, UserRound } from "lucide-react";
import { achievements, avatars } from "../data/catalog";
import { authProviders, supabase } from "../lib/supabase";

export function ProfilePage() {
  return (
    <section className="stack-screen">
      <header className="profile-hero">
        <div className="large-avatar">VK</div>
        <div>
          <p className="eyebrow">Profil</p>
          <h1>Vikingkriger</h1>
          <span>1 250 ærespoeng</span>
        </div>
      </header>

      <div className="catalog-grid">
        {avatars.map((avatar) => (
          <article className="catalog-card" key={avatar.id}>
            <div className="avatar-orb">{avatar.initials}</div>
            <strong>{avatar.name}</strong>
            <span>{avatar.tier}</span>
            {avatar.tier === "Premium" && <Lock size={16} />}
          </article>
        ))}
      </div>

      <div className="achievement-list">
        {achievements.map((achievement) => (
          <article className="achievement-card" key={achievement.id}>
            <Medal size={20} />
            <div>
              <strong>{achievement.name}</strong>
              <span>{achievement.description}</span>
            </div>
          </article>
        ))}
      </div>

      <button className="steel-button wide" type="button" onClick={() => (supabase ? authProviders.google() : undefined)}>
        <UserRound size={18} />
        Logg inn med Google eller Apple
      </button>
    </section>
  );
}
