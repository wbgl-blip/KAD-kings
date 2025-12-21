import { useState } from "react";

const PLAYERS = ["Beau", "Sean", "Mike", "Emily", "Jess", "Alex"];

function buildDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  const deck = [];
  for (const r of ranks) for (const s of suits) deck.push(`${r}${s}`);
  return deck.sort(() => Math.random() - 0.5);
}

export default function App() {
  const [deck, setDeck] = useState(buildDeck);
  const [index, setIndex] = useState(0);
  const [cardText, setCardText] = useState("Draw");

  const [beers, setBeers] = useState(
    Object.fromEntries(PLAYERS.map(p => [p, 0]))
  );

  const cardsLeft = deck.length - index;

  function drawCard() {
    if (index >= deck.length) return;
    const next = deck[index];
    setCardText(next);
    setIndex(i => i + 1);
  }

  function addBeer(name) {
    setBeers(b => ({ ...b, [name]: b[name] + 1 }));
  }

  function resetGame() {
    setDeck(buildDeck());
    setIndex(0);
    setCardText("Draw");
    setBeers(Object.fromEntries(PLAYERS.map(p => [p, 0])));
  }

  return (
    <div className="app">
      <h1>KAD Kings</h1>

      {/* ================= PLAYER GRID (LOCKED) ================= */}
      <div className="table">
        {PLAYERS.map(name => (
          <div className="player" key={name}>
            <div className="avatar" />
            <div className="name">{name}</div>
            <div className="count">🍺 {beers[name]}</div>
            <button className="beer" onClick={() => addBeer(name)}>
              +1 Beer
            </button>
          </div>
        ))}
      </div>

      {/* ================= HUD (DOCKED, SEPARATE LAYER) ================= */}
      <div className="hud">
        <div className="hud-inner">

          {/* TOP ROW */}
          <div className="hud-top">
            <div className="hud-card">
              <div className="card-title">{cardText}</div>
              <div className="card-sub">{cardsLeft} left</div>
            </div>

            <button className="draw" onClick={drawCard}>
              DRAW
            </button>
          </div>

          {/* INFO */}
          <div className="hud-info">
            <div>
              <strong>Progress</strong>
              <span>{52 - cardsLeft} / 52</span>
            </div>
            <div>
              <strong>Thumbmaster (J)</strong>
              <span>None</span>
            </div>
            <div>
              <strong>Heaven (7)</strong>
              <span>None</span>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="hud-actions">
            <button>START J</button>
            <button>START 7</button>
            <button className="reset" onClick={resetGame}>
              RESET
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
