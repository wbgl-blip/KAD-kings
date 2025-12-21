import { useState, useEffect } from "react";

const PLAYERS = ["Beau", "Sean", "Mike", "Emily", "Jess", "Alex"];

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

function buildDeck() {
  const deck = [];
  for (const r of RANKS) {
    for (const s of SUITS) {
      deck.push(`${r}${s}`);
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

export default function App() {
  // core game state
  const [deck, setDeck] = useState([]);
  const [drawIndex, setDrawIndex] = useState(0);
  const [currentCard, setCurrentCard] = useState("—");

  // player beers
  const [beers, setBeers] = useState(
    Object.fromEntries(PLAYERS.map(p => [p, 0]))
  );

  // init deck ONCE
  useEffect(() => {
    const freshDeck = buildDeck();
    setDeck(freshDeck);
    setCurrentCard("Draw");
    setDrawIndex(0);
  }, []);

  function drawCard() {
    if (drawIndex >= deck.length) return;

    const card = deck[drawIndex];
    setCurrentCard(card);
    setDrawIndex(i => i + 1);
  }

  function addBeer(player) {
    setBeers(prev => ({
      ...prev,
      [player]: prev[player] + 1
    }));
  }

  return (
    <div className="app">
      <h1>KAD Kings</h1>

      {/* PLAYERS — DO NOT MOVE */}
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
