// src/App.jsx
import { useMemo, useState } from "react";
import "./styles.css";

/* =========================
   CONSTANTS
========================= */

const PLAYERS = ["Beau", "Sean", "Mike", "Emily", "Jess", "Alex", "Kyle", "Sam"];

const CARD_RULES = {
  A: "Waterfall",
  2: "Pick someone to drink",
  3: "Me",
  4: "Everyone drinks",
  5: "Guys",
  6: "Everyone drinks",
  7: "Heaven",
  8: "Pick a Mate",
  9: "Rhyme",
  10: "Categories",
  J: "Thumbmaster",
  Q: "Question Master",
  K: "Make a Rule",
};

const SUITS = ["♠", "♥", "♦", "♣"];
const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

/* =========================
   DECK HELPERS
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

const rankOf = card => card.replace(/[^A-Z0-9]/g, "");

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

  const [mates, setMates] = useState(
    Object.fromEntries(PLAYERS.map(p => [p, []]))
  );

  const [phase, setPhase] = useState({ type: "IDLE", owner: null });
  const [drinkFlash, setDrinkFlash] = useState([]);
  const [thumbHolder, setThumbHolder] = useState(null);
  const [heavenHolder, setHeavenHolder] = useState(null);

  const [race, setRace] = useState({
    type: null,
    holder: null,
    reacted: new Set(),
  });

  const [waterfallReady, setWaterfallReady] = useState(new Set());
  const [waterfallIndex, setWaterfallIndex] = useState(null);
  const [focusPlayers, setFocusPlayers] = useState(new Set());

  const currentPlayer = PLAYERS[turn];
  const currentRank = card ? rankOf(card) : null;
  const DRINK_FLASH_MS = 2500;

  function drink(name) {
    setBeers(b => ({ ...b, [name]: b[name] + 1 }));
    setDrinkFlash(f => [...new Set([...f, name])]);
    setTimeout(
      () => setDrinkFlash(f => f.filter(n => n !== name)),
      DRINK_FLASH_MS
    );
  }

  function propagateDrink(name, visited = new Set()) {
    if (visited.has(name)) return;
    visited.add(name);
    drink(name);
    (mates[name] || []).forEach(m => propagateDrink(m, visited));
  }

  function drawCard() {
    if (phase.type !== "IDLE" || deck.length === 0) return;

    const [next, ...rest] = deck;
    setDeck(rest);
    setCard(next);

    const r = rankOf(next);
    const drawer = currentPlayer;

    if (r === "8") return setPhase({ type: "SELECT_MATE", owner: drawer });
    if (r === "2") return setPhase({ type: "SELECT_DRINK", owner: drawer });

    if (r === "A") {
      setWaterfallReady(new Set());
      return setPhase({ type: "WATERFALL_READY", owner: drawer });
    }

    if (r === "J") {
      setThumbHolder(drawer);
      setTurn(t => (t + 1) % PLAYERS.length);
      return;
    }

    if (r === "7") {
      setHeavenHolder(drawer);
      setTurn(t => (t + 1) % PLAYERS.length);
      return;
    }

    setTurn(t => (t + 1) % PLAYERS.length);
  }

  function startWaterfall() {
    setWaterfallIndex(PLAYERS.indexOf(currentPlayer));
    setPhase({ type: "WATERFALL_ACTIVE", owner: currentPlayer });
  }

  function endWaterfall() {
    setPhase({ type: "IDLE", owner: null });
    setWaterfallReady(new Set());
    setWaterfallIndex(null);
    setTurn(t => (t + 1) % PLAYERS.length);
  }

  function tapPlayer(name) {
    if (phase.type === "WATERFALL_READY") {
      setWaterfallReady(r => new Set(r).add(name));
      return;
    }

    if (phase.type === "WATERFALL_ACTIVE") {
      if (PLAYERS[waterfallIndex] !== name) return;
      setWaterfallIndex(i => (i + 1) % PLAYERS.length);
      return;
    }

    propagateDrink(name);
  }

  function focusPair(label) {
    const [a, b] = label.split("→").map(s => s.trim());
    setFocusPlayers(new Set([a, b]));
    setTimeout(() => setFocusPlayers(new Set()), 1500);
  }

  const matePills = useMemo(
    () =>
      Object.entries(mates).flatMap(([a, list]) =>
        list.map(b => `${a} → ${b}`)
      ),
    [mates]
  );

  const drawLocked = phase.type !== "IDLE";
  const allReady = waterfallReady.size === PLAYERS.length;

  return (
    <div className="app">
      <h1>KAD Kings</h1>
      <h2>{currentPlayer}’s Turn</h2>

      <div className="status">
        {CARD_RULES[currentRank] || "Draw a card"}
      </div>

      {/* CARD + PILLS */}
      <div className="control-bar">
        <div
          className={`card ${drawLocked ? "locked" : ""}`}
          onClick={drawCard}
        >
          {card ? (
            <>
              <div className="rank">{card}</div>
              <div className="rule">{CARD_RULES[currentRank]}</div>
            </>
          ) : (
            "DRAW"
          )}
        </div>

        <div className="pills">
          <span className="pill">👍 Thumb: {thumbHolder || "—"}</span>
          <span className="pill">☁️ Heaven: {heavenHolder || "—"}</span>

          {matePills.map((m, i) => (
            <button
              key={i}
              className="pill mate"
              onClick={() => focusPair(m)}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* PLAYERS */}
      <div className="players">
        {PLAYERS.map(p => (
          <div
            key={p}
            className={`player
              ${p === currentPlayer ? "turn" : ""}
              ${drinkFlash.includes(p) ? "drink" : ""}
              ${focusPlayers.has(p) ? "active" : ""}
            `}
            onClick={() => tapPlayer(p)}
          >
            <div className="badges">
              {p === currentPlayer && <span className="badge turn">TURN</span>}
              {p === thumbHolder && <span className="badge thumb">THUMB</span>}
              {p === heavenHolder && <span className="badge heaven">HEAVEN</span>}
            </div>

            <div className="name">{p}</div>
            <div className="beer">🍺 {beers[p]}</div>
          </div>
        ))}
      </div>

      {phase.type === "WATERFALL_READY" && (
        <button className="reset" disabled={!allReady} onClick={startWaterfall}>
          Start Waterfall
        </button>
      )}

      {phase.type === "WATERFALL_ACTIVE" && (
        <button className="reset" onClick={endWaterfall}>
          End Waterfall
        </button>
      )}
    </div>
  );
}
