// src/App.jsx
import { useMemo, useRef, useState } from "react";
import "./styles.css";

/* =========================
   DEV MODE FLAG
========================= */

const DEV_MODE = import.meta.env?.DEV ?? false;

/* =========================
   CONSTANTS
========================= */

const PLAYER_NAMES = ["Wes", "Zach", "Marsh", "Travis", "Kyle", "Jeff"];
const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

const RULE_TEXT = {
  A: "Waterfall — drawer starts when ready (drawer drinks first)",
  2: "Pick someone to drink",
  3: "Me — drawer drinks",
  4: "Women drink",
  5: "Guys drink",
  6: "Everyone drinks",
  7: "Heaven (Power)",
  8: "Pick a mate",
  9: "Rhyme — loser drinks",
  10: "Categories — loser drinks",
  J: "Thumbmaster (Power)",
  Q: "Question Master",
  K: "Make a rule",
};

const DRINK_FLASH_MS = 2000;

/* =========================
   DECK
========================= */

function buildDeck() {
  const deck = [];
  for (const r of RANKS) for (const s of SUITS) deck.push({ rank: r, suit: s });
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

/* =========================
   APP
========================= */

export default function App() {
  const [deck, setDeck] = useState(buildDeck);
  const [card, setCard] = useState(null);
  const [phase, setPhase] = useState("IDLE");
  const [turnIndex, setTurnIndex] = useState(0);

  const [players, setPlayers] = useState(
    PLAYER_NAMES.map((name) => ({
      name,
      beers: 0,
      mates: [],
    }))
  );

  const [heavenMaster, setHeavenMaster] = useState(null);
  const [thumbMaster, setThumbMaster] = useState(null);
  const [questionMaster, setQuestionMaster] = useState(null);

  const [flashNames, setFlashNames] = useState(new Set());
  const flashRef = useRef(null);

  const playersRef = useRef(players);
  playersRef.current = players;

  const currentPlayer = players[turnIndex];

  /* =========================
     HELPERS
  ========================= */

  function flashPlayers(names) {
    clearTimeout(flashRef.current);
    setFlashNames(new Set(names));
    flashRef.current = setTimeout(
      () => setFlashNames(new Set()),
      DRINK_FLASH_MS
    );
  }

  function addDrink(name) {
    setPlayers((p) =>
      p.map((x) =>
        x.name === name ? { ...x, beers: x.beers + 1 } : x
      )
    );
  }

  function nextTurn() {
    setTurnIndex((i) => (i + 1) % playersRef.current.length);
  }

  /* =========================
     DRAW CARD
  ========================= */

  function resolveDraw(next) {
    setCard(next);
    const r = next.rank;
    const drawer = currentPlayer.name;

    if (r === "3") {
      addDrink(drawer);
      flashPlayers([drawer]);
      nextTurn();
      return;
    }

    if (r === "7") {
      setHeavenMaster(drawer);
      nextTurn();
      return;
    }

    if (r === "J") {
      setThumbMaster(drawer);
      nextTurn();
      return;
    }

    if (r === "Q") {
      setQuestionMaster(drawer);
      nextTurn();
      return;
    }

    if (r === "8") {
      setPhase("PICK_MATE");
      return;
    }

    if (r === "K") {
      setPhase("MAKE_RULE");
      return;
    }

    nextTurn();
  }

  function drawCard() {
    if (phase !== "IDLE") return;
    if (!deck.length) return;

    const [next, ...rest] = deck;
    setDeck(rest);
    resolveDraw(next);
  }

  /* =========================
     DEV FORCE DRAW
  ========================= */

  function forceDrawAt(index) {
    if (!DEV_MODE || phase !== "IDLE") return;

    const forced = deck[index];
    const rest = deck.filter((_, i) => i !== index);
    setDeck(rest);
    resolveDraw(forced);
  }

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="app">
      <header className="header">
        <h1>KAD Kings</h1>
      </header>

      <section className="top-grid">
        <div className="panel" />
        <div
          className={`card ${card ? "active" : "draw"}`}
          onClick={drawCard}
        >
          {!card ? (
            <div className="card-draw-label">DECK</div>
          ) : (
            <>
              <div className="rank">
                {card.rank}
                {card.suit}
              </div>
              <div className="rule-text">{RULE_TEXT[card.rank]}</div>
            </>
          )}
        </div>
        <div className="panel" />
      </section>

      <section className="players">
        {players.map((p) => (
          <div
            key={p.name}
            className={`player ${
              flashNames.has(p.name) ? "FLASH" : ""
            } ${p.name === currentPlayer.name ? "TURN" : ""}`}
          >
            <div className="video-slot" />
            <div className="player-footer">
              <span className="player-name">{p.name}</span>
              <span className="player-beers">🍺 {p.beers}</span>
            </div>
          </div>
        ))}
      </section>

      {/* =========================
          DEV DECK (DEBUG ONLY)
      ========================= */}

      {DEV_MODE && (
        <section className="dev-deck">
          <div className="dev-title">DEV DECK (tap to force-draw)</div>
          <div className="dev-cards">
            {deck.map((c, i) => (
              <button
                key={`${c.rank}${c.suit}${i}`}
                className={`dev-card ${i === 0 ? "next" : ""}`}
                onClick={() => forceDrawAt(i)}
              >
                {c.rank}
                {c.suit}
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
