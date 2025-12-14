import { useState } from "react";
import "./App.css";

const SUITS = ["♦", "♥", "♣", "♠"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function buildDeck() {
  const deck = [];
  for (let suit of SUITS) {
    for (let rank of RANKS) {
      deck.push({ suit, rank });
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

function ruleText(rank) {
  switch (rank) {
    case "4":
      return "Whores — everyone drinks";
    case "7":
      return "Heaven — last one drinks";
    case "J":
      return "Thumb Master";
    case "Q":
      return "Questions — fuck up, drink";
    case "K":
      return "King — add to the pile";
    default:
      return "Drink.";
  }
}

export default function App() {
  const [players, setPlayers] = useState([
    { name: "yu", beers: 1 },
    { name: "uuu", beers: 0 },
    { name: "uu", beers: 0 },
  ]);

  const [turn, setTurn] = useState(0);
  const [deck, setDeck] = useState(buildDeck());
  const [card, setCard] = useState(null);

  function drawCard() {
    if (deck.length === 0) return;
    const next = deck[0];
    setDeck(deck.slice(1));
    setCard(next);
    setTurn((turn + 1) % players.length);
  }

  return (
    <div className="app">
      <h1>KAD Kings</h1>

      <div className="game">
        <div className="players">
          {players.map((p, i) => (
            <div
              key={i}
              className={`player ${i === turn ? "active" : ""}`}
            >
              <div className="name">{p.name}</div>
              <div className="beer">🍺 {p.beers}</div>
            </div>
          ))}
        </div>

        <div className="card-zone">
          {card && (
            <div className="card">
              <div className="corner top">
                <span>{card.rank}</span>
                <span>{card.suit}</span>
              </div>

              <div className="center">
                <span className="suit">{card.suit}</span>
                <div className="rule">{ruleText(card.rank)}</div>
              </div>

              <div className="corner bottom">
                <span>{card.rank}</span>
                <span>{card.suit}</span>
              </div>
            </div>
          )}

          <button className="draw" onClick={drawCard}>
            Draw Card
          </button>

          <div className="left">Cards left: {deck.length}</div>
        </div>
      </div>
    </div>
  );
}
