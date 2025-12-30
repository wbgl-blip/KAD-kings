import { useMemo, useState } from "react";
import "./styles.css";

const PLAYERS = ["Wes", "Zach", "Marsh", "Travis", "Kyle", "Jeff"];

export default function App() {
  const currentPlayer = "Wes";
  const cardsRemaining = 50;

  const [mates] = useState({});
  const [houseRules, setHouseRules] = useState([]);
  const [ruleDraft, setRuleDraft] = useState("");

  const matePills = useMemo(
    () =>
      Object.entries(mates).flatMap(([a, list]) =>
        list.map(b => `${a} → ${b}`)
      ),
    [mates]
  );

  function addRule() {
    if (!ruleDraft.trim()) return;
    setHouseRules(r => [...r, ruleDraft.trim()]);
    setRuleDraft("");
  }

  return (
    <div className="app">
      {/* HEADER */}
      <header className="header">
        <h1>KAD Kings</h1>
        <h2>{currentPlayer}’s Turn</h2>
        <p className="subtitle">Make a Rule: {currentPlayer} types it (persists)</p>
      </header>

      {/* GAME STRIP */}
      <section className="game-strip">
        <div className="panel">
          <div className="panel-title">🤝 Mates</div>
          <div className="panel-content">
            {matePills.length === 0
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="pill empty">—</div>
                ))
              : matePills.map((m, i) => (
                  <div key={i} className="pill">{m}</div>
                ))}
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">📜 Rules</div>
          <div className="panel-content">
            {houseRules.length === 0
              ? Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="pill empty">—</div>
                ))
              : houseRules.map((r, i) => (
                  <div key={i} className="pill">{r}</div>
                ))}
          </div>
        </div>
      </section>

      {/* CARD STAGE */}
      <section className="card-stage">
        <div className="card">
          A♠
          <div className="cards-left">{cardsRemaining} left</div>
        </div>

        <div className="rule-input">
          <input
            value={ruleDraft}
            onChange={e => setRuleDraft(e.target.value)}
            placeholder="Type the rule (persists)…"
          />
          <button onClick={addRule}>Add</button>
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
        <button className="reset">Save Rule</button>
      </footer>
    </div>
  );
}
