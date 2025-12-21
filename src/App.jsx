import { useState, useEffect } from "react";

/* =========================
   CONSTANTS
========================= */
const PLAYERS = ["Beau", "Sean", "Mike", "Emily", "Jess", "Alex"];

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

/* =========================
   DECK BUILDER
========================= */
function buildDeck() {
  const deck = [];
  for (const rank of RANKS) {
    for (const suit of SUITS) {
      deck.push(`${rank}${suit}`);
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

/* =========================
   APP
========================= */
export default function App() {
  // deck state
  const [deck, setDeck] = useState([]);
  const [drawIndex, setDrawIndex] = useState(0);
  const [currentCard, setCurrentCard] = useState("Draw");

  // beer counts
  const [beers, setBeers] = useState(
    Object.fromEntries(PLAYERS.map(p => [p, 0]))
  );

  /* =========================
     INIT (RUNS ONCE)
  ========================= */
  useEffect(() => {
    const freshDeck = buildDeck();
    setDeck(freshDeck);
    setDrawIndex(0);
    setCurrentCard("Draw");
  }, []);

  /* =========================
     ACTIONS
  ========================= */
  function drawCard() {
    if (drawIndex >= deck.length) return;

    const nextCard = deck[drawIndex];
    setCurrentCard(nextCard);
    setDrawIndex(i => i + 1);
  }

  function addBeer(player) {
    setBeers(prev => ({
      ...prev,
      [player]: prev[player] + 1
    }));
  }

  /* =========================
     RENDER
  ========================= */
  return (
    <div className="app">
      <h1>KAD Kings</h1>

      {/* PLAYERS — POSITIONS LOCKED BY CSS */}
      <div className="table">
        {PLAYERS.map(name => (
          <div className="player" key={name}>
            <div className="avatar" />
            <div className="name">{name}</div>
            <div className="count">🍺 {beers[name]}</div>
            <button className="beer" onClick={() => addBeer(name)}>
              +1 Beer
            </button>
          </div>
        ))}
      </div>

      {/* CARD — ALWAYS VISIBLE */}
      <div className="card">
        <div className="card-rank">{currentCard}</div>
        <div className="card-sub">
          {52 - drawIndex} cards left
        </div>
      </div>

      {/* DRAW BUTTON */}
      <button className="draw" onClick={drawCard}>
        DRAW CARD
      </button>
    </div>
  );
}
