import { useState } from "react";
import "./styles.css";

const PLAYER_NAMES = ["Wes", "Zach", "Marsh", "Travis", "Kyle", "Jeff"];

const INITIAL_PLAYERS = PLAYER_NAMES.map((name) => ({
  name,
  beers: 0,
  status: null, // TURN | THUMB | null
}));

export default function App() {
  const [phase, setPhase] = useState("WAITING"); // WAITING | PLAYING
  const [players, setPlayers] = useState(INITIAL_PLAYERS);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [enforcer, setEnforcer] = useState(null);
  const [card, setCard] = useState(null); // { rank, suit, remaining }

  function startGame() {
    if (phase !== "WAITING") return;

    const first = players[0].name;

    setPlayers((prev) =>
      prev.map((p) =>
        p.name === first ? { ...p, status: "TURN" } : p
      )
    );

    setCurrentPlayer(first);
    setEnforcer(null);
    setCard(null);
    setPhase("PLAYING");
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
        {/* MATES */}
        <div className="panel">
          <div className="panel-title">🤝 Mates</div>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="row placeholder">—</div>
          ))}
        </div>

        {/* CARD */}
        <div className="panel card-panel">
          {phase === "WAITING" || !card ? (
            <div className="card draw">DRAW</div>
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

        {/* RULES */}
        <div className="panel">
          <div className="panel-title">📜 Rules</div>
          {[...Array(4)].map((_, i) => (
            <div key={i} className="row placeholder">—</div>
          ))}
        </div>
      </section>

      {/* ACTIONS */}
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
          <div
            key={p.name}
            className={`player ${p.status || ""}`}
          >
            <div className="player-name">{p.name}</div>
            <div className="player-beers">🍺 {p.beers}</div>
          </div>
        ))}
      </section>
    </div>
  );
}
