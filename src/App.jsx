import { useState } from "react";
import "./styles.css";

const PLAYERS = ["Beau", "Sean", "Mike", "Emily", "Jess", "Alex"];

export default function App() {
  const [counts, setCounts] = useState(
    Object.fromEntries(PLAYERS.map((p) => [p, 0]))
  );

  function addBeer(name) {
    setCounts((c) => ({ ...c, [name]: c[name] + 1 }));
  }

  return (
    <div className="app">
      <h1>KAD Kings</h1>

      {/* PLAYERS (LOCKED GRID) */}
      <div className="player-grid">
        {PLAYERS.map((name) => (
          <div className="player" key={name}>
            <div className="avatar" />
            <div className="name">{name}</div>
            <div className="count">🍺 {counts[name]}</div>
            <button className="beer" onClick={() => addBeer(name)}>
              +1 Beer
            </button>
          </div>
        ))}
      </div>

      {/* HUD */}
      <div className="hud">
        {/* DRAW ROW */}
        <div className="hud-deck">
          <button className="draw-slim">DRAW</button>

          <div className="deck-side">
            <div className="deck-rank">Draw</div>
            <div className="deck-sub">No mercy</div>
          </div>
        </div>

        {/* STATUS ROW */}
        <div className="hud-row">
          <div className="hud-item">
            <span className="hud-title">Progress</span>
            0 / 52
          </div>
          <div className="hud-item">
            <span className="hud-title">Thumbmaster (J)</span>
            None
          </div>
          <div className="hud-item">
            <span className="hud-title">Heaven (7)</span>
            None
          </div>
        </div>

        {/* ACTIONS */}
        <div className="hud-actions">
          <button>START J</button>
          <button>START 7</button>
          <button className="secondary">RESET</button>
        </div>
      </div>
    </div>
  );
}
