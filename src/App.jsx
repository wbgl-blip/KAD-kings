const [thumbmaster, setThumbmaster] = useState(null); // J
const [heaven, setHeaven] = useState(null); // 7
import { useState } from "react";

const PLAYERS = ["Beau", "Sean", "Mike", "Emily", "Jess", "Alex"];

function buildDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
  const deck = [];
  for (const r of ranks) {
    for (const s of suits) {
      deck.push(`${r}${s}`);
    }
  }
  return deck.sort(() => Math.random() - 0.5);
}

export default function App() {
  const [deck, setDeck] = useState(buildDeck);
  const [index, setIndex] = useState(0);
  const [card, setCard] = useState(null);

  const [thumbmaster, setThumbmaster] = useState(null);
  const [heaven, setHeaven] = useState(null);

  const [beers, setBeers] = useState(
    Object.fromEntries(PLAYERS.map(p => [p, 0]))
  );

  const cardsLeft = deck.length - index;
  const activeRule = thumbmaster || heaven;

  function drawCard() {
    if (index >= deck.length) return;

    const next = deck[index];
    setCard(next);
    setIndex(i => i + 1);

    const rank = next.replace(/[^A-Z0-9]/g, "");

    if (rank === "J") {
      setThumbmaster(prev =>
        prev ? null : PLAYERS[(index + 1) % PLAYERS.length]
      );
    }

    if (rank === "7") {
      setHeaven(prev =>
        prev ? null : PLAYERS[(index + 1) % PLAYERS.length]
      );
    }
  }

  function addBeer(name) {
    setBeers(b => ({
      ...b,
      [name]: b[name] + 1
    }));
  }

  function resetGame() {
    if (activeRule) return;

    setDeck(buildDeck());
    setIndex(0);
    setCard(null);
    setThumbmaster(null);
    setHeaven(null);
    setBeers(
      Object.fromEntries(PLAYERS.map(p => [p, 0]))
    );
  }

  return (
    <div className="app">
      <h1>KAD Kings</h1>

      {/* PLAYERS */}
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

      {/* HUD */}
      <div className="hud">
        <div className="hud-inner">

          {/* TOP */}
          <div className="hud-top">
            <div className="hud-card">
              <div className="card-title">
                {card ?? "Draw"}
              </div>
              <div className="card-sub">
                {cardsLeft} left
              </div>
            </div>

            <button
              className="draw"
              onClick={drawCard}
              disabled={cardsLeft === 0}
            >
              {cardsLeft === 0 ? "EMPTY" : "DRAW"}
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
              <span>{thumbmaster ?? "None"}</span>
            </div>
            <div>
              <strong>Heaven (7)</strong>
              <span>{heaven ?? "None"}</span>
            </div>
          </div>

          {/* ACTIONS */}
          <div className="hud-actions">
            <button disabled>START J</button>
            <button disabled>START 7</button>
            <button
              className="reset"
              disabled={activeRule}
              onClick={resetGame}
            >
              RESET
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
