import { useState } from "react";
import "./styles.css";

const PLAYERS = ["Beau", "Mike", "Jess", "Alex", "Emily", "Sean"];

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

  return (
    <div className="app">
      <h1>KAD Kings</h1>

      {/* TABLE */}
      <div
        style={{
          position: "relative",
          width: 360,
          height: 360,              // 🔒 fixed circle
          margin: "0 auto",
        }}
      >
        {/* DECK */}
        <div
          className="card"
          style={{
            position: "absolute",
            inset: 0,
            margin: "auto",
            width: 100,
            height: 140,
          }}
        >
          {card ? (
            <>
              <div className="card-rank">{card}</div>
              <div className="card-sub">{cardsLeft} left</div>
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
          const angle = (360 / PLAYERS.length) * i - 90;
          const radius = 180; // ✅ THIS was the problem

          return (
            <div
              key={name}
              className="player"
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: `
                  rotate(${angle}deg)
                  translate(${radius}px)
                  rotate(${-angle}deg)
                `,
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

      {/* DRAW BUTTON — OUTSIDE CIRCLE */}
      <button
        className="draw"
        onClick={drawCard}
        style={{ marginTop: 14 }}
      >
        DRAW CARD
      </button>
    </div>
  );
}
