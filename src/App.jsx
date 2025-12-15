import { useState } from "react";

const SUITS = ["♠", "♥", "♦", "♣"];
const VALUES = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

function buildDeck() {
  const deck = [];
  SUITS.forEach(suit => {
    VALUES.forEach(value => {
      deck.push({ suit, value });
    });
  });
  return deck.sort(() => Math.random() - 0.5);
}

export default function App() {
  const [players, setPlayers] = useState([
    { name: "Player 1", beers: 0 },
    { name: "Player 2", beers: 0 },
    { name: "Player 3", beers: 0 },
  ]);

  const [deck, setDeck] = useState(buildDeck());
  const [card, setCard] = useState(null);
  const [turn, setTurn] = useState(0);

  function drawCard() {
    if (deck.length === 0) return;
    const [next, ...rest] = deck;
    setDeck(rest);
    setCard(next);
    setTurn((turn + 1) % players.length);
  }

  function addBeer(index) {
    const updated = [...players];
    updated[index].beers += 1;
    setPlayers(updated);
  }

  function updateName(index, name) {
    const updated = [...players];
    updated[index].name = name;
    setPlayers(updated);
  }

  return (
    <div className="app">
      <h1 className="title">KINGS</h1>

      <div className="table">
        {players.map((p, i) => (
          <div
            key={i}
            className={`player ${i === turn ? "active" : ""}`}
          >
            <input
              value={p.name}
              onChange={e => updateName(i, e.target.value)}
            />
            <div className="beer-count">🍺 {p.beers}</div>
            <button onClick={() => addBeer(i)}>+1 Beer</button>
          </div>
        ))}
      </div>

      <div className="deck-area">
        {card ? (
          <div className="card">
            <div className="value">{card.value}</div>
            <div className="suit">{card.suit}</div>
          </div>
        ) : (
          <div className="card back">DRAW</div>
        )}
      </div>

      <button className="draw-btn" onClick={drawCard}>
        Draw Card
      </button>
    </div>
  );
}
