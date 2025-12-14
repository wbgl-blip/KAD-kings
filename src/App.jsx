import { useState } from "react";

const SUITS = ["♠", "♥", "♦", "♣"];
const VALUES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function createDeck() {
  const deck = [];
  for (let suit of SUITS) {
    for (let value of VALUES) {
      deck.push({ suit, value });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

export default function App() {
  const [deck, setDeck] = useState(createDeck());
  const [currentCard, setCurrentCard] = useState(null);
  const [turn, setTurn] = useState(0);
  const players = ["Player 1", "Player 2", "Player 3", "Player 4"];

  function drawCard() {
    if (deck.length === 0) return;

    const newDeck = [...deck];
    const card = newDeck.pop();

    setDeck(newDeck);
    setCurrentCard(card);
    setTurn((turn + 1) % players.length);
  }

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h1>KAD Kings</h1>

      <h2>Turn:</h2>
      <ul>
        {players.map((p, i) => (
          <li
            key={p}
            style={{
              fontWeight: i === turn ? "bold" : "normal",
              color: i === turn ? "red" : "black",
            }}
          >
            {p} {i === turn ? "← YOUR TURN" : ""}
          </li>
        ))}
      </ul>

      <button
        onClick={drawCard}
        style={{
          padding: "10px 20px",
          fontSize: 16,
          marginTop: 10,
        }}
      >
        Draw Card
      </button>

      <p>Cards left: {deck.length}</p>

      {currentCard && (
        <div style={{ marginTop: 20 }}>
          <h2>
            {currentCard.value} {currentCard.suit}
          </h2>

          {currentCard.value === "4" && (
            <h3 style={{ color: "purple" }}>
              🍺 4 WHORES — EVERYONE DRINKS 🍺
            </h3>
          )}
        </div>
      )}
    </div>
  );
}
