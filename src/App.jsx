import { useState } from "react";
import "./styles.css";

const PLAYERS = ["Beau", "Sean", "Mike", "Emily", "Jess", "Alex"];

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

  const cardsLeft = 52 - index;

  function drawCard() {
    if (index >= deck.length) return;
    setCard(deck[index]);
    setIndex(i => i + 1);
  }

  return (
    <div className="app">
      <h1>KAD Kings</h1>

      {/* PLAYER GRID */}
      <div className="table">
        {PLAYERS.map((name, i) => (
          <div className="player" key={name}>
            <div className="avatar" />
            <div className="name">{name}</div>
            <div className="count">🍺 0</div>
            <button className="beer">+1 Beer</button>
          </div>
        ))}

        {/* CENTER CARD (BETWEEN ROWS) */}
        <div className="card" onClick={drawCard}>
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
      </div>

      {/* BOTTOM HUD */}
      <div className="hud">
        <div className="hud-row">
          <span>Progress</span>
          <span>{index} / 52</span>
        </div>

        <div className="hud-row">
          <span>Thumbmaster (J)</span>
          <span>None</span>
        </div>

        <div className="hud-row">
          <span>Heaven (7)</span>
          <span>None</span>
        </div>

        <div className="hud-actions">
          <button className="hud-btn">START J</button>
          <button className="hud-btn">START 7</button>
          <button className="hud-btn primary">RESTART</button>
        </div>
      </div>
    </div>
  );
}
