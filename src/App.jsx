import { useState } from "react";

const PLAYERS = ["Beau", "Sean", "Mike", "Emily", "Jess", "Alex"];

/* =========================
   DECK
========================= */
function buildDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
  const deck = [];

  for (const r of ranks) {
    for (const s of suits) {
      deck.push(`${r}${s}`);
    }
  }

  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }

  return deck;
}

function getRank(card) {
  return card.replace(/[^A-Z0-9]/g, "");
}

/* =========================
   APP
========================= */
export default function App() {
  const [deck, setDeck] = useState(buildDeck);
  const [card, setCard] = useState(null);
  const [turnIndex, setTurnIndex] = useState(0);

  const [thumbmaster, setThumbmaster] = useState(null);
  const [heaven, setHeaven] = useState(null);

  const [reaction, setReaction] = useState(null);

  const [beers, setBeers] = useState(
    Object.fromEntries(PLAYERS.map(p => [p, 0]))
  );

  const cardsLeft = deck.length;

  function currentPlayer() {
    return PLAYERS[turnIndex];
  }

  /* =========================
     DRAW (CLICK DECK)
  ========================= */
  function drawCard() {
    if (reaction || deck.length === 0) return;

    setDeck(d => {
      const [next, ...rest] = d;
      const rank = getRank(next);
      const player = currentPlayer();

      setCard(next);

      if (rank === "J") setThumbmaster(player);
      if (rank === "7") setHeaven(player);

      setTurnIndex(t => (t + 1) % PLAYERS.length);
      return rest;
    });
  }

  /* =========================
     BEERS
  ========================= */
  function addBeer(name) {
    setBeers(b => ({
      ...b,
      [name]: b[name] + 1
    }));
  }

  /* =========================
     UI
  ========================= */
  return (
    <div className={`app ${reaction ? "reaction" : ""}`}>
      <h1>KAD Kings</h1>

      {/* DECK + CARD */}
      <div className="deck-zone">
        <div
          className={`deck ${cardsLeft === 0 || reaction ? "disabled" : ""}`}
          onClick={drawCard}
        >
          <div className="deck-card" />
          <div className="deck-card" />
          <div className="deck-card" />
        </div>

        <div className="drawn-card">
          <div className="card-face">
            {card ?? "—"}
          </div>
          <div className="card-meta">
            {cardsLeft} left
          </div>
        </div>
      </div>

      {/* PLAYERS */}
      <div className="table">
        {PLAYERS.map((name, i) => (
          <div
            key={name}
            className={`player ${i === turnIndex ? "active" : ""}`}
          >
            <div className="avatar" />
            <div className="name">{name}</div>
            <div className="count">🍺 {beers[name]}</div>
            <button
              className="beer"
              onClick={() => addBeer(name)}
            >
              +1 Beer
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
