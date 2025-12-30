import { useState } from "react";
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
        <h2>
          {phase === "WAITING"
            ? "Waiting to Start"
            : `${currentPlayer}'s Turn`}
        </h2>
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

      {/* STATUS BAR */}
      <section className="status-bar">
        <span className="mode">🎤 RHYME</span>
        <span className="detail">
          Enforcer: <b>{enforcer || "—"}</b> — Current:{" "}
          <b>{currentPlayer || "—"}</b>
        </span>
        <button className="pill">Next</button>
        <button className="pill danger">Lose</button>
      </section>

      {/* PLAYERS */}
      <section className="players">
        {players.map((p) => (
          <div key={p.name} className={`player ${p.status || ""}`}>
            <span className="player-name">{p.name}</span>
            <span className="player-beers">🍺 {p.beers}</span>
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
