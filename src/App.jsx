import { useMemo } from "react";
import "./styles.css";

const PLAYERS = ["Wes", "Zach", "Marsh", "Travis", "Kyle", "Jeff"];

export default function App() {
  const currentPlayer = "Wes";
  const cardsRemaining = 42;

  const mates = {
    Wes: ["Kyle"],
  };

  const houseRules = ["No swearing", "Left hand only"];

  const matePills = useMemo(
    () =>
      Object.entries(mates).flatMap(([a, list]) =>
        list.map(b => `${a} → ${b}`)
      ),
    [mates]
  );

  return (
    <div className="app">
      {/* HEADER */}
      <header className="header">
        <h1>KAD Kings</h1>
        <h2>{currentPlayer}’s Turn</h2>
        <p className="subtitle">Draw a card</p>
      </header>

      {/* GAME STRIP */}
      <section className="game-strip">
        <div className="panel">
          <div className="panel-title">🤝 Mates</div>
          {matePills.length === 0 ? (
            <div className="pill muted">No mates</div>
          ) : (
            matePills.map((m, i) => (
              <div key={i} className="pill">{m}</div>
            ))
          )}
        </div>

        <div className="panel">
          <div className="panel-title">📜 Rules</div>
          {houseRules.length === 0 ? (
            <div className="pill muted">No rules</div>
          ) : (
            houseRules.map((r, i) => (
              <div key={i} className="pill">{r}</div>
            ))
          )}
        </div>
      </section>

      {/* CARD STAGE */}
      <section className="card-stage">
        <div className="card">
          DRAW
        </div>

        <div className="controls">
          <button className="control heaven">☁ Heaven</button>
          <button className="control thumb">👍 Thumb</button>
          <div className="cards-left">{cardsRemaining} cards</div>
        </div>
      </section>

      {/* VIDEO GRID */}
      <section className="video-grid">
        {PLAYERS.map(name => (
          <div
            key={name}
            className={`player ${
              name === currentPlayer ? "turn" : ""
            }`}
          >
            <video
              autoPlay
              muted
              playsInline
            />
            <div className="player-overlay">
              <span className="name">{name}</span>
              <span className="drinks">🍺 0</span>
            </div>
          </div>
        ))}
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <button className="reset">Reset Game</button>
      </footer>
    </div>
  );
}
