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
  const [counts, setCounts] = useState(
    Object.fromEntries(PLAYERS.map(p => [p, 0]))
  );

  const [deck, setDeck] = useState(buildDeck);
  const [index, setIndex] = useState(0);
  const [card, setCard] = useState(null);

  const [turn, setTurn] = useState(null);

  const cardsLeft = deck.length - index;

  function addBeer(name) {
    setCounts(c => ({ ...c, [name]: c[name] + 1 }));
  }

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

      {/* PLAYERS */}
      <div className="player-grid">
        {PLAYERS.map(name => (
          <div
            key={name}
            className={`player ${turn === name ? "active" : ""}`}
            onClick={() => setTurn(name)}
          >
            <div className="avatar" />
            <div className="name">{name}</div>
            <div className="count">🍺 {counts[name]}</div>
            <button
              className="beer"
              onClick={(e) => {
                e.stopPropagation();
                addBeer(name);
              }}
            >
              +1 Beer
            </button>
          </div>
        ))}
      </div>

      {/* HUD */}
      <div className="hud">
        <div className="hud-deck">
          <button className="draw-slim" onClick={drawCard}>
            DRAW
          </button>

          <div className="deck-side">
            {card ? (
              <>
                <div className="deck-rank">{card}</div>
                <div className="deck-sub">{cardsLeft} left</div>
              </>
            ) : (
              <>
                <div className="deck-rank">Draw</div>
                <div className="deck-sub">No mercy</div>
              </>
            )}
          </div>
        </div>

        <div className="hud-row">
          <div className="hud-item">
            <span className="hud-title">Turn</span>
            {turn || "—"}
          </div>
          <div className="hud-item">
            <span className="hud-title">Thumbmaster (J)</span>
            None
          </div>
          <div className="hud-item">
            <span className="hud-title">Heaven (7)</span>
            None
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
