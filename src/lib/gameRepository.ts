import type { GameState } from "../game/types";
import { supabase } from "./supabase";

export async function syncGame(game: GameState) {
  if (!supabase) return { ok: false, mode: "local" as const };

  const { error } = await supabase.from("games").upsert({
    id: game.id,
    code: game.code,
    status: game.status,
    theme_id: game.theme,
    state: game,
    started_at: game.startedAt ?? null,
    ended_at: game.endedAt ?? null
  });

  return { ok: !error, mode: "supabase" as const, error };
}

export async function findGameByCode(code: string) {
  if (!supabase) return null;
  const { data } = await supabase.from("games").select("state").eq("code", code).maybeSingle();
  return (data?.state as GameState | undefined) ?? null;
}

export function subscribeToGame(gameId: string, onChange: (game: GameState) => void) {
  if (!supabase) return () => undefined;
  const client = supabase;

  const channel = client
    .channel(`game:${gameId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${gameId}` },
      (payload) => {
        const state = payload.new.state as GameState | undefined;
        if (state) onChange(state);
      }
    )
    .subscribe();

  return () => {
    client.removeChannel(channel);
  };
}
