import { useState } from "react";
import "./styles.css";

const PLAYER_NAMES = ["Wes", "Zach", "Marsh", "Travis", "Kyle", "Jeff"];

export default function App() {
  const [gameStarted, setGameStarted] = useState(false);

  const players = PLAYER_NAMES.map((name) => ({
    name,
    beers: 0,
    status: null,
  }));

  return (
    <div className="app">
      {/* HEADER */}
      <header className="header">
        <h1>KAD Kings</h1>
        <h2>{gameStarted ? "Game On" : "Waiting to Start"}</h2>
      </header>

      {/* TOP GRID */}
      <section className="top-grid">
        {/* MATES */}
        <div className="panel">
          <div className="panel-title">🤝 Mates</div>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="row muted">—</div>
          ))}
        </div>

        {/* CARD */}
        <div className="panel card-panel">
          <div className="card">
            <div className="draw-text">DRAW</div>
          </div>
        </div>

        {/* RULES */}
        <div className="panel">
          <div className="panel-title">📜 Rules</div>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="row muted">—</div>
          ))}
        </div>
      </section>

      {/* ACTION BUTTONS */}
      <section className="actions-grid">
        <button className="action thumb" disabled={!gameStarted}>
          👍 Thumb
        </button>
        <button
          className="action ready"
          onClick={() => setGameStarted(true)}
        >
          Ready
        </button>
        <button className="action heaven" disabled={!gameStarted}>
          ☁ Heaven
        </button>
      </section>

      {/* STATUS BAR */}
      <section className="status-bar">
        <span className="mode">🎤 RHYME</span>
        <span className="detail">
          Enforcer: <b>—</b> — Current: <b>—</b>
        </span>
        <button className="pill">Next</button>
        <button className="pill danger">Lose</button>
      </section>

      {/* PLAYERS */}
      <section className="players">
        {players.map((p) => (
          <div key={p.name} className="player">
            <div className="player-overlay">
              <span className="player-name">{p.name}</span>
              <span className="player-beers">🍺 {p.beers}</span>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
