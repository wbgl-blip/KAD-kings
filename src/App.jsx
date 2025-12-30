import { useState } from "react";
import "./styles.css";

const PLAYERS = ["Wes", "Zach", "Marsh", "Travis", "Kyle", "Jeff"];

export default function App() {
  const [card] = useState({ rank: "J", suit: "♦", remaining: 52 });
  const [currentPlayer] = useState("Marsh");

  const players = PLAYERS.map((name) => ({
    name,
    beers: Math.floor(Math.random() * 8),
    status: name === currentPlayer ? "TURN" : null,
  }));

  return (
    <div className="app">
      {/* HEADER */}
      <header className="header">
        <h1>KAD Kings</h1>
        <h2>{currentPlayer}’s Turn</h2>
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
        <div className="card-stage">
          <div className="card">
            <div className="rank">
              {card.rank}
              {card.suit}
            </div>
            <div className="sub">{card.remaining} left</div>
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

      {/* ACTION ROW */}
      <section className="actions-grid">
        <button className="action thumb">👍 Thumb</button>
        <button className="action ready">Ready</button>
        <button className="action heaven">☁ Heaven</button>
      </section>

      {/* STATUS BAR */}
      <section className="status-bar">
        <span className="mode">🎤 RHYME</span>
        <span className="detail">
          Enforcer: <b>Travis</b> — Current: <b>Kyle</b>
        </span>
        <button className="pill">Next</button>
        <button className="pill danger">Lose</button>
      </section>

      {/* PLAYERS */}
      <section className="players">
        {players.map((p) => (
          <div key={p.name} className={`player ${p.status || ""}`}>
            <div className="video" />
            <div className="overlay">
              <span className="name">{p.name}</span>
              <span className="beers">🍺 {p.beers}</span>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
