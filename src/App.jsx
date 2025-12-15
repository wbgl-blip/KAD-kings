import { useState } from "react";

const SUITS = ["♠", "♥", "♦", "♣"];
const VALUES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function buildDeck() {
  let deck = [];
  SUITS.forEach(s =>
    VALUES.forEach(v => deck.push(`${v}${s}`))
  );
  return deck.sort(() => Math.random() - 0.5);
}

export default function App() {
  const [players, setPlayers] = useState([
    { name: "Player 1", beers: 0 },
    { name: "Player 2", beers: 0 },
    { name: "Player 3", beers: 0 }
  ]);

  const [deck, setDeck] = useState(buildDeck());
  const [currentCard, setCurrentCard] = useState(null);
  const [turn, setTurn] = useState(0);
  const [kings, setKings] = useState(0);

  const drawCard = () => {
    if (deck.length === 0) return;

    const newDeck = [...deck];
    const card = newDeck.pop();

    setDeck(newDeck);
    setCurrentCard(card);

    if (card.startsWith("K")) {
      setKings(k => k + 1);
    }

    setTurn((turn + 1) % players.length);
  };

  const addBeer = (index) => {
    const updated = [...players];
    updated[index].beers += 1;
    setPlayers(updated);
  };

  const updateName = (index, value) => {
    const updated = [...players];
    updated[index].name = value;
    setPlayers(updated);
  };

  return (
    <div className="app">
      <h1>KINGS</h1>

      <div className="players">
        {players.map((p, i) => (
          <div
            key={i}
            className={`player ${i === turn ? "active" : ""}`}
          >
            <input
              value={p.name}
              onChange={e => updateName(i, e.target.value)}
            />
            <div className="beer-row">
              🍺 {p.beers}
            </div>
            <button onClick={() => addBeer(i)}>+1 Beer</button>
            {i === turn && <div className="turn">👉 Current Turn</div>}
          </div>
        ))}
      </div>

      <div className="draw">
        <button onClick={drawCard}>Draw Card</button>
        <div className="status">
          🃏 Cards Left: {deck.length} / 52  
          <br />
          👑 Kings Drawn: {kings} / 4
        </div>
      </div>

      {currentCard && (
        <div className="card">
          {currentCard}
        </div>
      )}

      {deck.length === 0 && (
        <div className="game-over">
          🎉 Deck Empty — Game Over 🎉
        </div>
      )}
    </div>
  );
}
