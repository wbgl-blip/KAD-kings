import { useState } from "react";
import "./styles.css";

const PLAYERS = ["Wes", "Zach", "Marsh", "Travis", "Kyle", "Jeff"];

export default function App() {
  const [started, setStarted] = useState(false);
  const [turnIndex, setTurnIndex] = useState(0);
  const [card, setCard] = useState(null);

  const currentPlayer = started ? PLAYERS[turnIndex] : null;

  const players = PLAYERS.map((name) => ({
    name,
    beers: 0,
    status: started && name === currentPlayer ? "TURN" : null,
  }));

  function startGame() {
    setStarted(true);
    setTurnIndex(0);
    setCard(null);
  }

  function drawCard() {
    if (!started || card) return;
    setCard({ rank: "J", suit: "♦", remaining: 51 });
  }

  return (
    <div className="app">
      {/* HEADER */}
      <header className="header">
        <h1>KAD Kings</h1>
        <h2>{started ? `${currentPlayer}’s Turn` : "Waiting to Start"}</h2>
      </header>

      {/* FIXED TOP AREA (NO SCROLL) */}
      <div className="fixed-top">
        {/* PANELS + CARD */}
        <section className="top-grid">
          <div className="panel">
            <div className="panel-title">🤝 Mates</div>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="row muted">—</div>
            ))}
          </div>

          <div className="panel card-panel">
            <div
              className={`card ${!started ? "locked" : ""}`}
              onClick={drawCard}
            >
              {card ? (
                <>
                  <div className="rank">
                    {card.rank}
                    {card.suit}
                  </div>
                  <div className="sub">{card.remaining} left</div>
                </>
              ) : (
                <div className="draw-text">DRAW</div>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-title">📜 Rules</div>
            {[...Array(4)].map((_, i) => (
              <div key={i} className="row muted">—</div>
            ))}
          </div>
        </section>

        {/* ACTIONS */}
        <section className="actions-grid">
          <button className="action thumb" disabled={!started}>
            👍 Thumb
          </button>

          <button
            className="action ready"
            onClick={startGame}
            disabled={started}
          >
            {started ? "In Progress" : "Ready"}
          </button>

          <button className="action heaven" disabled={!started}>
            ☁ Heaven
          </button>
        </section>
      </div>

      {/* SCROLLING PLAYER GRID */}
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
