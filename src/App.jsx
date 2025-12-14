import { useState } from "react";
import "./App.css";

const SUITS = ["♠", "♥", "♦", "♣"];
const VALUES = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

const RULES = {
  A: "Waterfall. Don’t fuck it up.",
  2: "You pick a victim. They drink.",
  3: "Me. Congrats, dumbass.",
  4: "Whores. Everyone drinks.",
  5: "Thumb master. Be fast or be fucked.",
  6: "Dicks. Guys drink.",
  7: "Heaven. Last one drinks.",
  8: "Mate. You’re stuck together.",
  9: "Rhyme. If you pause, drink.",
  10: "Categories. Brain optional.",
  J: "Make a rule. Abuse it.",
  Q: "Questions. Answer = drink.",
  K: "King’s Cup. Pray."
};

export default function App() {
  const [players, setPlayers] = useState([
    { name: "dt", beers: 0 },
    { name: "vh", beers: 0 },
    { name: "rf", beers: 0 },
    { name: "fff", beers: 0 },
    { name: "gg", beers: 0 },
    { name: "hh", beers: 0 }
  ]);

  const [deck, setDeck] = useState(shuffleDeck());
  const [card, setCard] = useState(null);
  const [turn, setTurn] = useState(0);

  function shuffleDeck() {
    const d = [];
    for (let s of SUITS) for (let v of VALUES) d.push({ suit: s, value: v });
    return d.sort(() => Math.random() - 0.5);
  }

  function drawCard() {
    if (!deck.length) return;
    const next = deck[0];
    setCard(next);
    setDeck(deck.slice(1));
    setTurn((turn + 1) % players.length);
  }

  function adjustBeer(i, delta) {
    setPlayers(p =>
      p.map((pl, idx) =>
        idx === i ? { ...pl, beers: Math.max(0, pl.beers + delta) } : pl
      )
    );
  }

  return (
    <div className="app">
      <h1>KAD Kings</h1>

      {/* TABLE AREA */}
      <div className="table">

        {/* PLAYERS */}
        {players.map((p, i) => {
          const angleStart = 210;
          const angleEnd = -30;
          const step = (angleEnd - angleStart) / (players.length - 1);
          const angle = (angleStart + step * i) * (Math.PI / 180);

          const x = 50 + Math.cos(angle) * 42;
          const y = 52 + Math.sin(angle) * 28;

          return (
            <div
              key={i}
              className={`player ${i === turn ? "active" : ""}`}
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: "translate(-50%, -50%)"
              }}
            >
              <div className="name">{p.name}</div>
              <div className="controls">
                <button onClick={() => adjustBeer(i, -1)}>-</button>
                <span>🍺 {p.beers}</span>
                <button onClick={() => adjustBeer(i, 1)}>+</button>
              </div>
            </div>
          );
        })}

        {/* CENTER DECK */}
        <div className="center">
          {card && (
            <div className="card">
              <div className="top">{card.value}{card.suit}</div>
              <div className="middle">{card.suit}</div>
              <div className="rule">{RULES[card.value]}</div>
            </div>
          )}

          <button className="draw" onClick={drawCard}>
            Draw Card
          </button>

          <div className="meta">
            Cards left: {deck.length}
            <div>😇 Heaven —</div>
            <div>👍 Thumb —</div>
            <div>❓ Questions —</div>
          </div>
        </div>
      </div>
    </div>
  );
}
