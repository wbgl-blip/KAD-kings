import { useState } from "react";
import "./styles.css";

/* =========================
   CARD SETUP
========================= */
const SUITS = ["♠", "♥", "♦", "♣"];
const VALUES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

const RULES = {
  A: "Waterfall. You start it.",
  2: "You. Drink.",
  3: "Me. Congrats, dumbass.",
  4: "Floor. Slow people drink.",
  5: "Guys drink.",
  6: "Chicks drink.",
  7: "Heaven. Last one drinks.",
  8: "Mate. You’re stuck together.",
  9: "Rhyme. Hesitate = drink.",
  "10": "Categories. First to fail drinks.",
  J: "Make a rule. Abuse it.",
  Q: "Pick someone. Ruin their night.",
  K: "Pour one into the void."
};

function buildDeck() {
  const deck = [];
  SUITS.forEach(suit => {
    VALUES.forEach(value => {
      deck.push({ suit, value });
    });
  });
  return deck.sort(() => Math.random() - 0.5);
}

/* =========================
   APP
========================= */
export default function App() {
  const [players, setPlayers] = useState([
    { id: 1, name: "dt", beers: 0 },
    { id: 2, name: "vh", beers: 0 },
    { id: 3, name: "rf", beers: 0 },
    { id: 4, name: "fff", beers: 0 },
    { id: 5, name: "gg", beers: 0 },
    { id: 6, name: "hh", beers: 0 }
  ]);

  const [editingId, setEditingId] = useState(null);
  const [deck, setDeck] = useState(buildDeck());
  const [currentCard, setCurrentCard] = useState(null);
  const [turnIndex, setTurnIndex] = useState(0);

  /* =========================
     GAME ACTIONS
  ========================= */
  function drawCard() {
    if (deck.length === 0) return;
    const [next, ...rest] = deck;
    setCurrentCard(next);
    setDeck(rest);
    setTurnIndex((turnIndex + 1) % players.length);
  }

  function changeBeer(id, delta) {
    setPlayers(players =>
      players.map(p =>
        p.id === id
          ? { ...p, beers: Math.max(0, p.beers + delta) }
          : p
      )
    );
  }

  function updateName(id, newName) {
    if (!newName.trim()) return;
    setPlayers(players =>
      players.map(p =>
        p.id === id ? { ...p, name: newName.trim() } : p
      )
    );
    setEditingId(null);
  }

  /* =========================
     RENDER
  ========================= */
  return (
    <div className="app">
      <h1>KAD Kings</h1>

      {/* LEFT PLAYERS */}
      <div className="players left">
        {players.slice(0, 3).map((p, idx) => {
          const isTurn = turnIndex === idx;
          return (
            <div
              key={p.id}
              className={`player ${isTurn ? "active" : ""}`}
            >
              {editingId === p.id ? (
                <input
                  autoFocus
                  defaultValue={p.name}
                  onBlur={e => updateName(p.id, e.target.value)}
                  onKeyDown={e =>
                    e.key === "Enter" &&
                    updateName(p.id, e.target.value)
                  }
                />
              ) : (
                <div
                  className="name"
                  onClick={() => setEditingId(p.id)}
                >
                  {p.name}
                </div>
              )}
              <div className="beer">
                <button onClick={() => changeBeer(p.id, -1)}>-</button>
                🍺 {p.beers}
                <button onClick={() => changeBeer(p.id, 1)}>+</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* CENTER */}
      <div className="center">
        <div className="deck-placeholder" />
        {currentCard && (
          <div className="card">
            <div className="value">
              {currentCard.value}
              {currentCard.suit}
            </div>
            <div className="rule">
              {RULES[currentCard.value]}
            </div>
          </div>
        )}
        <button className="draw-btn" onClick={drawCard}>
          Draw Card
        </button>
        <div className="deck-count">
          Cards left: {deck.length}
        </div>
      </div>

      {/* RIGHT PLAYERS */}
      <div className="players right">
        {players.slice(3).map((p, idx) => {
          const realIndex = idx + 3;
          const isTurn = turnIndex === realIndex;
          return (
            <div
              key={p.id}
              className={`player ${isTurn ? "active" : ""}`}
            >
              {editingId === p.id ? (
                <input
                  autoFocus
                  defaultValue={p.name}
                  onBlur={e => updateName(p.id, e.target.value)}
                  onKeyDown={e =>
                    e.key === "Enter" &&
                    updateName(p.id, e.target.value)
                  }
                />
              ) : (
                <div
                  className="name"
                  onClick={() => setEditingId(p.id)}
                >
                  {p.name}
                </div>
              )}
              <div className="beer">
                <button onClick={() => changeBeer(p.id, -1)}>-</button>
                🍺 {p.beers}
                <button onClick={() => changeBeer(p.id, 1)}>+</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
