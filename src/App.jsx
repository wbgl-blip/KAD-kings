import { useMemo } from "react";
import "./styles.css";

const PLAYERS = ["Wes", "Zach", "Marsh", "Travis", "Kyle", "Jeff"];
const PANEL_ROWS = 4;

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

  const paddedMates = [
    ...matePills,
    ...Array(Math.max(0, PANEL_ROWS - matePills.length)).fill(null),
  ].slice(0, PANEL_ROWS);

  const paddedRules = [
    ...houseRules,
    ...Array(Math.max(0, PANEL_ROWS - houseRules.length)).fill(null),
  ].slice(0, PANEL_ROWS);

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
          <div className="panel-content">
            {paddedMates.map((m, i) =>
              m ? (
                <div key={i} className="pill">{m}</div>
              ) : (
                <div key={i} className="pill empty" />
              )
            )}
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">📜 Rules</div>
          <div className="panel-content">
            {paddedRules.map((r, i) =>
              r ? (
                <div key={i} className="pill">{r}</div>
              ) : (
                <div key={i} className="pill empty" />
              )
            )}
          </div>
        </div>
      </section>

      {/* CARD STAGE */}
      <section className="card-stage">
        <div className="card">DRAW</div>

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
            className={`player ${name === currentPlayer ? "turn" : ""}`}
          >
            <video autoPlay muted playsInline />
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
