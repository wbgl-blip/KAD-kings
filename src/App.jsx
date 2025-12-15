import { useState } from "react";
import "./styles.css";

const SUITS = ["♠", "♥", "♦", "♣"];
const VALUES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

const RULES = {
  A: "Waterfall",
  2: "You",
  3: "Me",
  4: "Floor",
  5: "Guys",
  6: "Chicks",
  7: "Heaven",
  8: "Mate",
  9: "Rhyme",
  10: "Categories",
  J: "Make a Rule",
  Q: "Question Master",
  K: "King — Pour into the cup",
};

function buildDeck() {
  const deck = [];
  SUITS.forEach((s) =>
    VALUES.forEach((v) => deck.push({ suit: s, value: v }))
  );
  return deck.sort(() => Math.random() - 0.5);
}

export default function App() {
  const [players, setPlayers] = useState([
    { name: "Player 1", beers: 0 },
    { name: "Player 2", beers: 0 },
    { name: "Player 3", beers: 0 },
  ]);

  const [turn, setTurn] = useState(0);
  const [deck, setDeck] = useState(buildDeck());
  const [card, setCard] = useState(null);

  const nextTurn = () =>
    setTurn((prev) => (prev + 1) % players.length);

  const drawCard = () => {
    if (deck.length === 0) return;
    const [next, ...rest] = deck;
    setCard(next);
    setDeck(rest);
    nextTurn();
  };

  const updateName = (i, name) => {
    const copy = [...players];
    copy[i].name = name;
    setPlayers(copy);
  };

  const addBeer = (i) => {
    const copy = [...players];
    copy[i].beers += 1;
    setPlayers(copy);
  };

  const addPlayer = () => {
    if (players.length >= 8) return;
    setPlayers([...players, { name: `Player ${players.length + 1}`, beers: 0 }]);
  };

  const removePlayer = (i) => {
    if (players.length <= 2) return;
    const copy = players.filter((_, idx) => idx !== i);
    setPlayers(copy);
    if (turn >= copy.length) setTurn(0);
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
              onChange={(e) => updateName(i, e.target.value)}
            />

            <div className="beer">🍺 {p.beers}</div>

            <div className="actions">
              <button onClick={() => addBeer(i)}>+1 Beer</button>
              <button className="remove" onClick={() => removePlayer(i)}>
                ✕
              </button>
            </div>

            {i === turn && <div className="turn">👉 Current Turn</div>}
          </div>
        ))}
      </div>

      <button className="add-player" onClick={addPlayer}>
        + Add Player
      </button>

      <h2>DRAW</h2>

      <button className="draw" onClick={drawCard}>
        Draw Card
      </button>

      {card && (
        <div className="card">
          <div className="card-value">
            {card.value}
            {card.suit}
          </div>
          <div className="rule">{RULES[card.value]}</div>
        </div>
      )}
    </div>
  );
}
