import { useMemo, useState } from "react";
import "./styles.css";

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

const suits = ["♠", "♥", "♦", "♣"];
const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

function buildDeck() {
  const d = [];
  ranks.forEach(r => suits.forEach(s => d.push(`${r}${s}`)));
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

const rankOf = c => c.replace(/[^A-Z0-9]/g, "");

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

  const current = PLAYERS[turn];
  const rank = card ? rankOf(card) : null;

  /* ======================
     DRINK + PROPAGATION
  ====================== */
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

  /* ======================
     DRAW
  ====================== */
  function draw() {
    if (phase.type !== "IDLE" || deck.length === 0) return;

    const [c, ...rest] = deck;
    setDeck(rest);
    setCard(c);

    const r = rankOf(c);
    const drawer = current;

    if (r === "8") {
      setPhase({ type: "SELECT_MATE", owner: drawer });
    } else if (r === "2") {
      setPhase({ type: "SELECT_DRINK", owner: drawer });
    } else if (r === "J") {
      setThumbHolder(drawer);
    } else if (r === "7") {
      setHeavenHolder(drawer);
    }

    setTurn(t => (t + 1) % PLAYERS.length);
  }

  /* ======================
     TAP PLAYER
  ====================== */
  function tapPlayer(name) {

    /* ---- PICK A MATE ---- */
    if (phase.type === "SELECT_MATE") {
      if (name === phase.owner) return;

      setMates(m => ({
        ...m,
        [phase.owner]: [...new Set([...(m[phase.owner] || []), name])]
      }));
      setPhase({ type: "IDLE", owner: null });
      return;
    }

    /* ---- PICK DRINK ---- */
    if (phase.type === "SELECT_DRINK") {
      propagateDrink(name);
      setPhase({ type: "IDLE", owner: null });
      return;
    }

    /* ---- NORMAL TAP ---- */
    propagateDrink(name);
  }

  /* ======================
     LEFT OF
  ====================== */
  function leftOf(p) {
    const i = PLAYERS.indexOf(p);
    return PLAYERS[(i + 1) % PLAYERS.length];
  }

  /* ======================
     MATE CHAINS
  ====================== */
  const mateChains = useMemo(() => {
    const out = [];
    Object.entries(mates).forEach(([a, list]) => {
      list.forEach(b => out.push(`${a} → ${b}`));
    });
    return out;
  }, [mates]);

  return (
    <div className="app">
      <h1>KAD Kings</h1>
      <h2>{current}’s Turn</h2>

      <div className="card" onClick={draw}>
        {card ? (
          <>
            <div className="rank">{card}</div>
            <div className="rule">{CARD_RULES[rank]}</div>
          </>
        ) : "DRAW"}
      </div>

      <div className="players">
        {PLAYERS.map(p => {
          const isTurn = p === current;
          const isActive = p === phase.owner;
          const selectable =
            (phase.type === "SELECT_MATE" || phase.type === "SELECT_DRINK") &&
            p !== phase.owner;

          return (
            <div
              key={p}
              className={`player
                ${isTurn ? "turn" : ""}
                ${isActive ? "active" : ""}
                ${selectable ? "active" : ""}
                ${drinkFlash.includes(p) ? "drink" : ""}
              `}
              onClick={() => tapPlayer(p)}
            >
              <div className="name">{p}</div>

              <div className="badges">
                {p === thumbHolder && (
                  <span className="badge">👍 THUMB</span>
                )}
                {p === heavenHolder && (
                  <span className="badge">☁️ HEAVEN</span>
                )}
              </div>

              <div className="beer">🍺 {beers[p]}</div>
              <div className="left">◀ Left: {leftOf(p)}</div>
            </div>
          );
        })}
      </div>

      {mateChains.length > 0 && (
        <div className="mates">
          {mateChains.map((m, i) => (
            <div key={i}>🤝 {m}</div>
          ))}
        </div>
      )}

      <button className="reset" onClick={() => window.location.reload()}>
        Reset
      </button>
    </div>
  );
}
