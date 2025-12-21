import { useState } from "react";
import "./styles.css";

const PLAYERS = ["Beau", "Sean", "Mike", "Emily", "Alex", "Jess"];

function buildDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
  const deck = [];
  for (const r of ranks) for (const s of suits) deck.push(`${r}${s}`);
  return deck.sort(() => Math.random() - 0.5);
}

export default function App() {
  const [deck] = useState(buildDeck);
  const [index, setIndex] = useState(0);
  const [card, setCard] = useState(null);

  const cardsLeft = deck.length - index;

  function drawCard() {
    if (index >= deck.length) return;
    setCard(deck[index]);
    setIndex(i => i + 1);
  }

  /* ===== GEOMETRY FIX ===== */
  const size = 420;
  const centerX = size / 2;
  const centerY = size / 2 - 20; // ⬆️ lifts whole circle
  const radius = 235;           // ⬆️ pushes players outward

  return (
    <div className="app">
      <h1>KAD Kings</h1>

      <div
        style={{
          position: "relative",
          width: size,
          height: size,
          margin: "0 auto",
        }}
      >
        {/* CENTER DECK */}
        <div
          className="card"
          style={{
            position: "absolute",
            top: centerY - 95,
            left: centerX - 70,
          }}
        >
          {card ? (
            <>
              <div className="card-rank">{card}</div>
              <div className="card-sub">{cardsLeft} cards left</div>
            </>
          ) : (
            <>
              <div className="card-rank">Draw</div>
              <div className="card-sub">No mercy</div>
            </>
          )}
        </div>

        {/* PLAYERS */}
        {PLAYERS.map((name, i) => {
          const angle = (2 * Math.PI / PLAYERS.length) * i - Math.PI / 2;
          const x = centerX + radius * Math.cos(angle) - 45;
          const y = centerY + radius * Math.sin(angle) - 65;

          return (
            <div
              key={name}
              className="player"
              style={{
                position: "absolute",
                left: x,
                top: y,
                width: 90,
                height: 130,
              }}
            >
              <div className="avatar" />
              <div className="name">{name}</div>
              <div className="count">🍺 0</div>
              <button className="beer">+1 Beer</button>
            </div>
          );
        })}
      </div>

      {/* DRAW BUTTON — NOW CLEAR */}
      <button className="draw" onClick={drawCard}>
        DRAW CARD
      </button>
    </div>
  );
}
