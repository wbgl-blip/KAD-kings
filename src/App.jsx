import { useState } from "react";

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

  function drawCard() {
    if (index >= deck.length) return;
    setCard(deck[index]);
    setIndex(i => i + 1);
  }

  return (
    <div className="app">
      <h1>KAD Kings</h1>

      {/* PLAYER GRID */}
      <div className="player-grid">
        {PLAYERS.map(name => (
          <div className="player" key={name}>
            <div className="avatar" />
            <div className="name">{name}</div>
            <div className="count">🍺 0</div>
            <button className="beer">+1 Beer</button>
          </div>
        ))}
      </div>

      {/* HUD */}
      <div className="hud">
        <div className="hud-deck" onClick={drawCard}>
          <div className="deck-body">
            <span className="deck-label">DRAW CARD</span>
          </div>
          <div className="deck-face">
            {card ? card : "—"}
          </div>
        </div>

        <div className="hud-row">
          <div className="hud-item">
            <span className="hud-title">Progress</span>
            <span className="hud-value">{index} / 52</span>
          </div>

          <div className="hud-item">
            <span className="hud-title">Thumbmaster (J)</span>
            <span className="hud-value">None</span>
          </div>

          <div className="hud-item">
            <span className="hud-title">Heaven (7)</span>
            <span className="hud-value">None</span>
          </div>
        </div>

        <div className="hud-actions">
          <button>START J</button>
          <button>START 7</button>
          <button className="secondary">RESET</button>
        </div>
      </div>
    </div>
  );
}
