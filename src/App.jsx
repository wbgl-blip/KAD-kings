import { useState } from "react";

const SUITS = ["♠", "♥", "♦", "♣"];
const VALUES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

const CARD_RULES = {
  A: "Waterfall — everyone starts drinking",
  2: "You — choose someone to drink",
  3: "Me — you drink",
  4: "Whores — everyone drinks",
  5: "Thumb Master — last to put thumb down drinks",
  6: "Dicks — all guys drink",
  7: "Heaven — last to point up drinks",
  8: "Mate — pick a drinking buddy",
  9: "Rhyme — first to mess up drinks",
  10: "Categories — first to fail drinks",
  J: "Make a rule",
  Q: "Questions — first to answer drinks",
  K: "King — pour into the cup",
};

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
  const [kings, setKings] = useState(0);

  const players = ["Player 1", "Player 2", "Player 3", "Player 4"];

  function drawCard() {
    if (deck.length === 0 || kings === 4) return;

    const newDeck = [...deck];
    const card = newDeck.pop();

    if (card.value === "K") {
      setKings(kings + 1);
    }

    setDeck(newDeck);
    setCurrentCard(card);
    setTurn((turn + 1) % players.length);
  }

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h1>KAD Kings</h1>

      <h2>Kings: {kings} / 4</h2>
      {kings === 4 && (
        <h2 style={{ color: "red" }}>👑 GAME OVER — DRINK THE CUP 👑</h2>
      )}

      <h3>Turn</h3>
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
        disabled={kings === 4}
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
          <p style={{ fontSize: 18 }}>
            {CARD_RULES[currentCard.value]}
          </p>
        </div>
      )}
    </div>
  );
}
