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
  const count = PLAYERS.length;

  function drawCard() {
    if (index >= deck.length) {
      setCard("DECK EMPTY");
      return;
    }
    setCard(deck[index]);
    setIndex(i => i + 1);
  }

  return (
    <div className="app">
      <h1>KAD Kings</h1>

      {/* Square radial table */}
      <div
        className="table"
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 360,
          aspectRatio: "1 / 1",
          margin: "0 auto",
        }}
      >
        {/* Center deck (smaller) */}
        <div
          className="card"
          style={{
            position: "absolute",
            inset: 0,
            margin: "auto",
            width: 110,
            height: 150,
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

        {/* Players around deck */}
        {PLAYERS.map((name, i) => {
          const angle = (360 / count) * i - 90;
          const radius = 155; // 🔑 increased spacing

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

      <button className="draw" onClick={drawCard}>
        DRAW CARD
      </button>
    </div>
  );
}
