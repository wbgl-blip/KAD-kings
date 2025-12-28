import { useMemo, useState } from "react";
import "./styles.css";

/* =========================
   CONSTANTS
========================= */

const PLAYERS = ["Wes", "Zach", "Marsh", "Travis", "Kyle", "Jeff"];

const CARD_RULES = {
  A: "Waterfall",
  2: "Pick someone to drink",
  3: "Me",
  4: "4s for Whores — Everyone drinks",
  5: "Guys drink",
  6: "6s for Dicks — Everyone drinks",
  7: "Heaven",
  8: "Pick a Mate",
  9: "Rhyme",
  10: "Categories",
  J: "Thumbmaster",
  Q: "Question Master",
  K: "Make a Rule",
};

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

/* =========================
   DECK
========================= */

function buildDeck() {
  const deck = [];
  RANKS.forEach(r => SUITS.forEach(s => deck.push(`${r}${s}`)));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

const rankOf = c => c.replace(/[^A-Z0-9]/g, "");

/* =========================
   APP
========================= */

export default function App() {
  const [deck, setDeck] = useState(buildDeck);
  const [card, setCard] = useState(null);
  const [turn, setTurn] = useState(0);

  const [beers, setBeers] = useState(
    Object.fromEntries(PLAYERS.map(p => [p, 0]))
  );

  const [thumbHolder, setThumbHolder] = useState(null);
  const [heavenHolder, setHeavenHolder] = useState(null);
  const [questionHolder, setQuestionHolder] = useState(null);

  const [phase, setPhase] = useState({ type: "IDLE", owner: null });
  const [drinkFlash, setDrinkFlash] = useState([]);

  const currentPlayer = PLAYERS[turn];
  const currentRank = card ? rankOf(card) : null;

  /* =========================
     DRINKS
  ========================= */

  function drink(name) {
    setBeers(b => ({ ...b, [name]: b[name] + 1 }));
    setDrinkFlash(f => [...new Set([...f, name])]);
    setTimeout(
      () => setDrinkFlash(f => f.filter(n => n !== name)),
      1800
    );
  }

  function drinkAll() {
    PLAYERS.forEach(drink);
  }

  /* =========================
     DRAW
  ========================= */

  function drawCard() {
    if (phase.type !== "IDLE") return;
    if (!deck.length) return;

    const [next, ...rest] = deck;
    setDeck(rest);
    setCard(next);

    const r = rankOf(next);
    const drawer = currentPlayer;

    if (r === "3") drink(drawer);
    if (["4","6"].includes(r)) drinkAll();

    if (r === "J") setThumbHolder(drawer);
    if (r === "7") setHeavenHolder(drawer);
    if (r === "Q") setQuestionHolder(drawer);

    setTurn(t => (t + 1) % PLAYERS.length);
  }

  /* =========================
     RESET
  ========================= */

  function resetGame() {
    setDeck(buildDeck());
    setCard(null);
    setTurn(0);
    setBeers(Object.fromEntries(PLAYERS.map(p => [p, 0])));
    setThumbHolder(null);
    setHeavenHolder(null);
    setQuestionHolder(null);
    setPhase({ type: "IDLE", owner: null });
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="app">
      <h1>KAD Kings</h1>
      <h2>{currentPlayer}’s Turn</h2>

      <div className="status">
        {CARD_RULES[currentRank] || "Draw a card"}
      </div>

      <div className="control-bar">
        <div
          className={`card ${phase.type !== "IDLE" ? "locked" : ""}`}
          onClick={drawCard}
        >
          {card ? (
            <>
              <div className="rank">{card}</div>
              <div className="rule">{CARD_RULES[currentRank]}</div>
            </>
          ) : "DRAW"}
        </div>
      </div>

      <div className="players">
        {PLAYERS.map(p => (
          <div
            key={p}
            className={`player video
              ${p === currentPlayer ? "turn" : ""}
              ${drinkFlash.includes(p) ? "drink" : ""}
            `}
          >
            {/* VIDEO LAYER */}
            <video
              className="video-feed"
              autoPlay
              muted
              playsInline
            />

            {/* TOP OVERLAY */}
            <div className="overlay top">
              {p === currentPlayer && <span className="badge turn">TURN</span>}
              {p === thumbHolder && <span className="badge thumb">THUMB</span>}
              {p === heavenHolder && <span className="badge heaven">HEAVEN</span>}
              {p === questionHolder && <span className="badge q">Q</span>}
            </div>

            {/* BOTTOM OVERLAY */}
            <div className="overlay bottom">
              <span className="name">{p}</span>
              <span className="beer">🍺 {beers[p]}</span>
              <span className="live">LIVE</span>
            </div>

            {/* REACTION LAYER (future) */}
            <div className="reaction-layer" />
          </div>
        ))}
      </div>

      <button className="reset" onClick={resetGame}>
        Reset Game
      </button>
    </div>
  );
}
