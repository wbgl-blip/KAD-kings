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

  /* ---------- CORE ---------- */
  const [deck, setDeck] = useState(buildDeck);
  const [card, setCard] = useState(null);
  const [turn, setTurn] = useState(0);

  /* ---------- COUNTS ---------- */
  const [beers, setBeers] = useState(
    Object.fromEntries(PLAYERS.map(p => [p, 0]))
  );

  /* ---------- MATES ---------- */
  const [mates, setMates] = useState(
    Object.fromEntries(PLAYERS.map(p => [p, []]))
  );

  /* ---------- PHASE ---------- */
  /**
   * IDLE
   * SELECT_MATE
   * SELECT_DRINK
   * WATERFALL_READY
   * WATERFALL_ACTIVE
   * RACE_THUMB_READY
   * RACE_THUMB_ACTIVE
   * RACE_HEAVEN_READY
   * RACE_HEAVEN_ACTIVE
   */
  const [phase, setPhase] = useState({ type: "IDLE", owner: null });

  /* ---------- VISUAL ---------- */
  const [drinkFlash, setDrinkFlash] = useState([]);

  /* ---------- SPECIAL ---------- */
  const [thumbHolder, setThumbHolder] = useState(null);
  const [heavenHolder, setHeavenHolder] = useState(null);

  /* ---------- RACE ---------- */
  const [raceTaps, setRaceTaps] = useState(new Set());

  const currentPlayer = PLAYERS[turn];
  const currentRank = card ? rankOf(card) : null;

  /* =========================
     DRINK LOGIC
  ========================= */

  function drink(name) {
    setBeers(b => ({ ...b, [name]: b[name] + 1 }));
    setDrinkFlash(f => [...new Set([...f, name])]);
    setTimeout(() => {
      setDrinkFlash(f => f.filter(n => n !== name));
    }, 5000);
  }

  function propagateDrink(name, visited = new Set()) {
    if (visited.has(name)) return;
    visited.add(name);
    drink(name);
    (mates[name] || []).forEach(m => propagateDrink(m, visited));
  }

  /* =========================
     DRAW CARD
  ========================= */

  function drawCard() {
    if (phase.type !== "IDLE" || deck.length === 0) return;

    const [next, ...rest] = deck;
    setDeck(rest);
    setCard(next);

    const r = rankOf(next);
    const drawer = currentPlayer;

    if (r === "8") setPhase({ type: "SELECT_MATE", owner: drawer });
    else if (r === "2") setPhase({ type: "SELECT_DRINK", owner: drawer });
    else if (r === "A") setPhase({ type: "WATERFALL_READY", owner: drawer });
    else if (r === "J") setThumbHolder(drawer);
    else if (r === "7") setHeavenHolder(drawer);

    setTurn(t => (t + 1) % PLAYERS.length);
  }

  /* =========================
     RACE START
  ========================= */

  function startRace(type) {
    setRaceTaps(new Set());
    setPhase({
      type: type === "THUMB" ? "RACE_THUMB_ACTIVE" : "RACE_HEAVEN_ACTIVE",
      owner: type === "THUMB" ? thumbHolder : heavenHolder
    });
  }

  /* =========================
     TAP PLAYER
  ========================= */

  function tapPlayer(name) {

    /* ---- WATERFALL ---- */
    if (phase.type === "WATERFALL_READY") {
      if (name !== phase.owner) return;
      setPhase({ type: "WATERFALL_ACTIVE", owner: name });
      return;
    }

    /* ---- SELECT MATE ---- */
    if (phase.type === "SELECT_MATE") {
      if (name === phase.owner) return;
      setMates(m => ({
        ...m,
        [phase.owner]: [...new Set([...m[phase.owner], name])]
      }));
      setPhase({ type: "IDLE", owner: null });
      return;
    }

    /* ---- SELECT DRINK ---- */
    if (phase.type === "SELECT_DRINK") {
      propagateDrink(name);
      setPhase({ type: "IDLE", owner: null });
      return;
    }

    /* ---- RACES ---- */
    if (phase.type === "RACE_THUMB_ACTIVE" || phase.type === "RACE_HEAVEN_ACTIVE") {
      if (raceTaps.has(name)) return;

      const next = new Set(raceTaps);
      next.add(name);

      if (next.size === PLAYERS.length - 1) {
        const loser = PLAYERS.find(p => !next.has(p));
        propagateDrink(loser);
        setRaceTaps(new Set());
        setPhase({ type: "IDLE", owner: null });
      } else {
        setRaceTaps(next);
      }
      return;
    }

    /* ---- NORMAL ---- */
    propagateDrink(name);
  }

  /* =========================
     INFO
  ========================= */

  const matePills = useMemo(() => {
    const out = [];
    Object.entries(mates).forEach(([a, list]) => {
      list.forEach(b => out.push(`${a} → ${b}`));
    });
    return out;
  }, [mates]);

  /* =========================
     RENDER
  ========================= */

  return (
    <div className="app">
      <h1>KAD Kings</h1>
      <h2>{currentPlayer}’s Turn</h2>

      <div className="status">
        {thumbHolder && `Thumb: ${thumbHolder}`} {thumbHolder && heavenHolder && " • "}
        {heavenHolder && `Heaven: ${heavenHolder}`}
      </div>

      {/* CARD */}
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

      {/* INFO PILLS */}
      <div className="info">
        {thumbHolder && phase.type === "IDLE" && (
          <span className="pill action" onClick={() => startRace("THUMB")}>
            Start THUMB race
          </span>
        )}
        {heavenHolder && phase.type === "IDLE" && (
          <span className="pill action" onClick={() => startRace("HEAVEN")}>
            Start HEAVEN race
          </span>
        )}
        {matePills.map((m, i) => (
          <span key={i} className="pill mate">{m}</span>
        ))}
      </div>

      {/* PLAYERS */}
      <div className="players">
        {PLAYERS.map(p => (
          <div
            key={p}
            className={`player
              ${p === currentPlayer ? "turn" : ""}
              ${p === phase.owner ? "active" : ""}
              ${drinkFlash.includes(p) ? "drink" : ""}
            `}
            onClick={() => tapPlayer(p)}
          >
            <div className="badges">
              {p === thumbHolder && <span className="badge thumb">THUMB</span>}
              {p === heavenHolder && <span className="badge heaven">HEAVEN</span>}
            </div>
            <div className="name">{p}</div>
            <div className="beer">🍺 {beers[p]}</div>
          </div>
        ))}
      </div>

      <button className="reset" onClick={() => window.location.reload()}>
        Reset
      </button>
    </div>
  );
}
