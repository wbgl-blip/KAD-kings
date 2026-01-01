import { useState, useEffect } from "react";
import "./styles.css";

const PLAYER_NAMES = ["Wes", "Zach", "Marsh", "Travis", "Kyle", "Jeff"];

export default function App() {
  const [phase, setPhase] = useState("WAITING"); // WAITING | PLAYING
  const [players, setPlayers] = useState(
    PLAYER_NAMES.map((name) => ({
      name,
      beers: 0,
      status: null,
    }))
  );
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [enforcer, setEnforcer] = useState(null);
  const [card, setCard] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  /* =========================
     FULLSCREEN
  ========================= */
  useEffect(() => {
    function onFsChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }
    document.addEventListener("fullscreenchange", onFsChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  /* =========================
     GAME FLOW
  ========================= */
  function startGame() {
    if (phase !== "WAITING") return;
    const first = players[0].name;

    setPlayers((prev) =>
      prev.map((p) =>
        p.name === first ? { ...p, status: "TURN" } : p
      )
    );

    setCurrentPlayer(first);
    setPhase("PLAYING");
  }

  function drawCard() {
    if (phase !== "PLAYING") return;

    const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
    const suits = ["♠","♥","♦","♣"];

    setCard({
      rank: ranks[Math.floor(Math.random() * ranks.length)],
      suit: suits[Math.floor(Math.random() * suits.length)],
      remaining: Math.floor(Math.random() * 40) + 10,
    });
  }

  return (
    <div className="app">
      {/* HEADER */}
      <header className="header">
        <h1>KAD Kings</h1>

        <button
          className={`fullscreen-btn ${isFullscreen ? "active" : ""}`}
          onClick={toggleFullscreen}
          aria-label="Toggle Fullscreen"
        >
          {isFullscreen ? "✕" : "⛶"}
        </button>
      </header>

      {/* TOP GRID */}
      <section className="top-grid">
        <Panel title="🤝 Mates" />

        <div className="panel card-panel">
          {!card ? (
            <div className="card draw" onClick={drawCard}>
              DRAW
            </div>
          ) : (
            <div className="card active">
              <div className="rank">
                {card.rank}
                {card.suit}
              </div>
              <div className="sub">{card.remaining} left</div>
            </div>
          )}
        </div>

        <Panel title="📜 Rules" />
      </section>

      {/* ACTION BUTTONS */}
      <section className="actions">
        <button className="btn thumb" disabled={phase === "WAITING"}>
          👍 Thumb
        </button>

        <button
          className="btn ready"
          onClick={startGame}
          disabled={phase !== "WAITING"}
        >
          Ready
        </button>

        <button className="btn heaven" disabled={phase === "WAITING"}>
          ☁ Heaven
        </button>
      </section>

      {/* STATUS BAR (GAME MESSAGES ONLY) */}
      <section className="status-bar">
        <span className="detail">
          {phase === "WAITING"
            ? "Waiting for everyone to be ready"
            : "Draw a card or react to the game"}
        </span>
      </section>

      {/* PLAYERS (VIDEO-READY) */}
      <section className="players">
        {players.map((p) => (
          <div key={p.name} className={`player ${p.status || ""}`}>
            <div className="video-placeholder" />
            <div className="overlay">
              <span className="player-name">{p.name}</span>
              <span className="player-beers">🍺 {p.beers}</span>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function Panel({ title }) {
  return (
    <div className="panel">
      <div className="panel-title">{title}</div>
      {[...Array(4)].map((_, i) => (
        <div key={i} className="row">—</div>
      ))}
    </div>
  );
}
