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
  const [deck, setDeck] = useState(buildDeck);
  const [index, setIndex] = useState(0);
  const [card, setCard] = useState(null);
  const [beers, setBeers] = useState(
    Object.fromEntries(PLAYERS.map(p => [p, 0]))
  );

  const cardsLeft = deck.length - index;

  function drawCard() {
    if (index >= deck.length) return;
    setCard(deck[index]);
    setIndex(i => i + 1);
  }

  function addBeer(name) {
    setBeers(b => ({ ...b, [name]: b[name] + 1 }));
  }

  function resetGame() {
    setDeck(buildDeck());
    setIndex(0);
    setCard(null);
    setBeers(Object.fromEntries(PLAYERS.map(p => [p, 0])));
  }

  return (
    <div className="app">
      <h1>KAD Kings</h1>

      {/* PLAYER GRID */}
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

        {/* CARD */}
        <div className="card">
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
      </div>

      {/* HUD */}
      <div className="hud">
        <div className="hud-top">
          <button className="draw" onClick={drawCard}>
            DRAW CARD
          </button>
          <button className="hud-min">–</button>
        </div>

        <div className="hud-info">
          <div className="hud-box">
            Progress<br />
            {index} / 52
          </div>
          <div className="hud-box">
            Thumbmaster (J)<br />
            None
          </div>
          <div className="hud-box">
            Heaven (7)<br />
            None
          </div>
        </div>

        <div className="hud-actions">
          <button>START J</button>
          <button>START 7</button>
          <button className="reset" onClick={resetGame}>
            RESET
          </button>
        </div>
      </div>
    </div>
  );
}
