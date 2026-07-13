import { useEffect, useMemo, useState } from "react";
import { BottomNav } from "./components/BottomNav";
import { createGame, startGame } from "./game/engine";
import type { GameState, Player } from "./game/types";
import { archiveGame, loadCurrentGame, saveCurrentGame } from "./lib/storage";
import { findGameByCode, subscribeToGame, syncGame } from "./lib/gameRepository";
import { AdminPage } from "./pages/AdminPage";
import { GamePage } from "./pages/GamePage";
import { HistoryPage } from "./pages/HistoryPage";
import { HomePage } from "./pages/HomePage";
import { LobbyPage } from "./pages/LobbyPage";
import { ProfilePage } from "./pages/ProfilePage";
import { StatsPage } from "./pages/StatsPage";
import type { View } from "./types/navigation";

function App() {
  const [view, setView] = useState<View>("home");
  const [game, setGame] = useState<GameState | null>(() => loadCurrentGame());

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("kamp");
    if (!code) return;
    findGameByCode(code.toUpperCase()).then((foundGame) => {
      if (!foundGame) return;
      setGame(foundGame);
      setView(foundGame.status === "lobby" ? "lobby" : "game");
    });
  }, []);

  useEffect(() => {
    if (!game) return;
    saveCurrentGame(game);
    syncGame(game).catch(() => undefined);
  }, [game]);

  useEffect(() => {
    if (game?.status === "complete") archiveGame(game);
  }, [game]);

  useEffect(() => {
    if (!game) return undefined;
    return subscribeToGame(game.id, setGame);
  }, [game?.id]);

  const activeView = useMemo(() => {
    if (view === "game" && !game) return "home";
    if (view === "lobby" && !game) return "home";
    return view;
  }, [game, view]);

  function handleCreate(players: Omit<Player, "hand" | "score" | "roundScores" | "roundWins" | "passCount">[], theme: string) {
    const nextGame = createGame(players, theme);
    setGame(nextGame);
    setView("lobby");
  }

  function handleStartGame() {
    if (!game) return;
    setGame(startGame(game));
    setView("game");
  }

  return (
    <div className="app-shell">
      <main className="screen">
        {activeView === "home" && <HomePage currentGame={game} onCreate={handleCreate} onNavigate={setView} />}
        {activeView === "lobby" && game && <LobbyPage game={game} onStart={handleStartGame} onBack={() => setView("home")} />}
        {activeView === "game" && game && <GamePage game={game} onGameChange={setGame} onHome={() => setView("home")} />}
        {activeView === "history" && <HistoryPage />}
        {activeView === "stats" && <StatsPage />}
        {activeView === "profile" && <ProfilePage />}
        {activeView === "admin" && <AdminPage />}
      </main>
      <BottomNav view={activeView} onNavigate={setView} />
    </div>
  );
}

export default App;
