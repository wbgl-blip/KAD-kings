import { useState } from "react";
import "./styles.css";

/* =====================
   CARD SETUP
===================== */
const SUITS = ["♠", "♥", "♦", "♣"];
const VALUES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function buildDeck() {
  const deck = [];
  for (let s of SUITS) {
    for (let v of VALUES) {
      deck.push({ suit: s, value: v });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

function cardText(card) {
  if (!card) return "";
  return `${card.value}${card.suit}`;
}

function ruleFor(card) {
  if (!card) return "";
  switch (card.value) {
    case "A":
      return "Waterfall. Good luck idiots.";
    case "2":
      return "You. Drink.";
    case "3":
      return "Me. I'm drinking because of you.";
    case "4":
      return "Whores. You know who you are.";
    case "5":
      return "Guys drink. Yes, all of you.";
    case "6":
      return "Chicks drink. No excuses.";
    case "7":
      return "Heaven. Last one drinks, dumbass.";
    case "8":
      return "Pick a mate. You're stuck with them.";
    case "9":
      return "Rhyme. Fail and suffer.";
    case "10":
      return "Categories. Be fast or be drunk.";
    case "J":
      return "Make a rule. Abuse it.";
    case "Q":
      return "Question master. Slip up, drink.";
    case "K":
      return "King. Pour some in the cup.";
    default:
      return "";
  }
}

/* =====================
   APP
===================== */
export default function App() {
  const [players, setPlayers] = useState([
    { name: "dt", drinks: 0 },
    { name: "vh", drinks: 0 },
    { name: "rf", drinks: 0 },
    { name: "hh", drinks: 0 },
    { name: "gg", drinks: 0 },
    { name: "fff", drinks: 0 }
  ]);

  const [turn, setTurn] = useState(0);
  const [deck, setDeck] = useState(buildDeck());
  const [card, setCard] = useState(null);

  function drawCard() {
    if (deck.length === 0) return;
    const [next, ...rest] = deck;
    setCard(next);
    setDeck(rest);
    setTurn((t) => (t + 1) % players.length);
  }

  function addDrink(i, delta) {
    setPlayers((p) =>
      p.map((pl, idx) =>
        idx === i ? { ...pl, drinks: Math.max(0, pl.drinks + delta) } : pl
      )
    );
  }

  const leftPlayers = players.slice(0, 3);
  const rightPlayers = players.slice(3);

  return (
    <div className="app">
      <h1 className="title">KAD Kings</h1>

      <div className="table">
        {/* LEFT */}
        <div className="side">
          {leftPlayers.map((p, i) => {
            const index = i;
            return (
              <div
                key={p.name}
                className={`player ${turn === index ? "active" : ""}`}
              >
                <div className="name">{p.name}</div>
                <div className="counter">
                  <button onClick={() => addDrink(index, -1)}>-</button>
                  🍺 {p.drinks}
                  <button onClick={() => addDrink(index, 1)}>+</button>
                </div>
              </div>
            );
          })}
        </div>

        {/* CENTER */}
        <div className="center">
          <div className="card">
            {card ? cardText(card) : "?"}
          </div>

          <button className="draw" onClick={drawCard}>
            DRAW
          </button>

          <div className="rule">
            {card ? ruleFor(card) : "Draw a card. Ruin friendships."}
          </div>

          <div className="remaining">
            Cards left: {deck.length}
          </div>
        </div>

        {/* RIGHT */}
        <div className="side">
          {rightPlayers.map((p, i) => {
            const index = i + 3;
            return (
              <div
                key={p.name}
                className={`player ${turn === index ? "active" : ""}`}
              >
                <div className="name">{p.name}</div>
                <div className="counter">
                  <button onClick={() => addDrink(index, -1)}>-</button>
                  🍺 {p.drinks}
                  <button onClick={() => addDrink(index, 1)}>+</button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
