import { useState } from "react";
import "./styles.css";

const PLAYER_NAMES = ["Wes", "Zach", "Marsh", "Travis", "Kyle", "Jeff"];

const CARD_RULES = {
  A: "Waterfall — everyone drinks together",
  "2": "You — pick someone to drink",
  "3": "Me — you drink",
  "4": "Floor — last to touch drinks",
  "5": "Guys drink",
  "6": "Chicks drink",
  "7": "Heaven — last to raise hand drinks",
  "8": "Mate — choose a mate",
  "9": "Rhyme — start a rhyme",
  "10": "Categories — pick a category",
  J: "Make a rule",
  Q: "Question master",
  K: "King — pour into the cup",
};

export default function App() {
  const [phase, setPhase] = useState("WAITING"); // WAITING | PLAYING
  const [players, setPlayers] = useState(
    PLAYER_NAMES.map((name) => ({
      name,
      beers: 0,
      status: null,
    }))
  );
  const [currentIndex, setCurrentIndex] = useState(0);
  const [card, setCard] = useState(null);
  const [statusMessage, setStatusMessage] = useState(
    "Waiting for players to get ready"
  );

  function startGame() {
    if (phase !== "WAITING") return;

    setPhase("PLAYING");
    setCurrentIndex(0);
    setPlayers((prev) =>
      prev.map((p, i) => ({
        ...p,
        status: i === 0 ? "TURN" : null,
      }))
    );
    setStatusMessage(`${players[0].name} starts`);
  }

  function drawCard() {
    if (phase !== "PLAYING") return;

    const ranks = Object.keys(CARD_RULES);
    const suits = ["♠", "♥", "♦", "♣"];
    const rank = ranks[Math.floor(Math.random() * ranks.length)];
    const suit = suits[Math.floor(Math.random() * suits.length)];

    setCard({
      rank,
      suit,
      remaining: Math.floor(Math.random() * 40) + 10,
    });

    setStatusMessage(
      `${players[currentIndex].name}: ${CARD_RULES[rank]}`
    );
  }

  function nextTurn() {
    const nextIndex = (currentIndex + 1) % players.length;

    setPlayers((prev) =>
      prev.map((p, i) => ({
        ...p,
        status: i === nextIndex ? "TURN" : null,
      }))
    );

    setCurrentIndex(nextIndex);
    setCard(null);
    setStatusMessage(`${players[nextIndex].name}'s turn`);
  }

  function loseTurn() {
    setPlayers((prev) =>
      prev.map((p, i) =>
        i === currentIndex ? { ...p, beers: p.beers + 1 } : p
      )
    );
    nextTurn();
  }

  return (
    <div className="app">
      {/* HEADER */}
      <header className="header">
        <h1>KAD Kings</h1>
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

      {/* ACTIONS */}
      <section className="actions">
        <button className="btn thumb" disabled={phase !== "PLAYING"}>
          👍 Thumb
        </button>

        <button
          className="btn ready"
          onClick={startGame}
          disabled={phase !== "WAITING"}
        >
          Ready
        </button>

        <button className="btn heaven" disabled={phase !== "PLAYING"}>
          ☁ Heaven
        </button>
      </section>

      {/* STATUS BAR */}
      <section className="status-bar">
        <span className="status-text">{statusMessage}</span>
        <button className="pill" onClick={nextTurn}>
          Next
        </button>
        <button className="pill danger" onClick={loseTurn}>
          Lose
        </button>
      </section>

      {/* PLAYERS */}
      <section className="players">
        {players.map((p) => (
          <div key={p.name} className={`player ${p.status || ""}`}>
            <div className="video-tile" />
            <div className="player-info">
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
