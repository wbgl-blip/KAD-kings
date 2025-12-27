// src/App.jsx
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

  // PHASES:
  // IDLE
  // SELECT_MATE
  // SELECT_DRINK
  // WATERFALL_READY
  // WATERFALL_RUNNING
  // REACTION_READY
  // REACTION_RUNNING
  const [phase, setPhase] = useState({ type: "IDLE", owner: null });

  const [ready, setReady] = useState(new Set());
  const [reaction, setReaction] = useState(new Set());

  const [thumbHolder, setThumbHolder] = useState(null);   // J
  const [heavenHolder, setHeavenHolder] = useState(null); // 7

  const [drinkFlash, setDrinkFlash] = useState([]);

  const current = PLAYERS[turn];
  const rank = card ? rankOf(card) : null;

  /* ======================
     HELPERS
  ====================== */
  const leftOf = (p) =>
    PLAYERS[(PLAYERS.indexOf(p) + 1) % PLAYERS.length];

  function drink(name) {
    setBeers(b => ({ ...b, [name]: b[name] + 1 }));
    setDrinkFlash(f => f.includes(name) ? f : [...f, name]);
    setTimeout(() => {
      setDrinkFlash(f => f.filter(n => n !== name));
    }, 5000);
  }

  function propagateDrink(name, visited = new Set()) {
    if (visited.has(name)) return;
    visited.add(name);
    drink(name);
    mates[name]?.forEach(m => propagateDrink(m, visited));
  }

  /* ======================
     DRAW
  ====================== */
  function draw() {
    if (phase.type !== "IDLE") return;
    if (deck.length === 0) return;

    const [c, ...rest] = deck;
    setDeck(rest);
    setCard(c);

    const r = rankOf(c);
    const drawer = current;

    if (r === "A") {
      setReady(new Set());
      setPhase({ type: "WATERFALL_READY", owner: drawer });
    } else if (r === "8") {
      setPhase({ type: "SELECT_MATE", owner: drawer });
    } else if (r === "2") {
      setPhase({ type: "SELECT_DRINK", owner: drawer });
    } else if (r === "J") {
      setThumbHolder(drawer);
      setReaction(new Set());
      setPhase({ type: "REACTION_READY", owner: drawer });
    } else if (r === "7") {
      setHeavenHolder(drawer);
      setReaction(new Set());
      setPhase({ type: "REACTION_READY", owner: drawer });
    } else {
      setPhase({ type: "IDLE", owner: null });
    }

    setTurn(t => (t + 1) % PLAYERS.length);
  }

  /* ======================
     WATERFALL
  ====================== */
  function tapStartWaterfall(p) {
    if (phase.type !== "WATERFALL_READY") return;

    if (!ready.has(p)) {
      const next = new Set(ready);
      next.add(p);
      setReady(next);
      return;
    }

    if (p === phase.owner && ready.size === PLAYERS.length) {
      setPhase({ type: "WATERFALL_RUNNING", owner: phase.owner });
    }
  }

  /* ======================
     TAP PLAYER
  ====================== */
  function tapPlayer(name) {
    // WATERFALL RUNNING: taps do nothing (physical drinking IRL)
    if (phase.type === "WATERFALL_RUNNING") return;

    // REACTION READY (holder taps to start)
    if (phase.type === "REACTION_READY") {
      if (name !== phase.owner) return;
      setReaction(new Set());
      setPhase({ type: "REACTION_RUNNING", owner: phase.owner });
      return;
    }

    // REACTION RUNNING
    if (phase.type === "REACTION_RUNNING") {
      if (name === phase.owner) return;
      if (reaction.has(name)) return;

      const next = new Set(reaction);
      next.add(name);

      if (next.size === PLAYERS.length - 1) {
        // Last person to tap loses
        const loser = PLAYERS.find(
          p => p !== phase.owner && !next.has(p)
        );
        if (loser) propagateDrink(loser);

        setReaction(new Set());
        setPhase({ type: "IDLE", owner: null });
      } else {
        setReaction(next);
      }
      return;
    }

    // OWNER-ONLY PHASES
    if (phase.owner && name !== phase.owner) return;

    if (phase.type === "SELECT_MATE") {
      if (name !== phase.owner) {
        setMates(m => ({
          ...m,
          [phase.owner]: [...new Set([...m[phase.owner], name])]
        }));
        setPhase({ type: "IDLE", owner: null });
      }
      return;
    }

    if (phase.type === "SELECT_DRINK") {
      propagateDrink(name);
      setPhase({ type: "IDLE", owner: null });
      return;
    }

    // NORMAL TAP
    propagateDrink(name);
  }

  /* ======================
     MATE LIST
  ====================== */
  const mateChains = useMemo(() => {
    const out = [];
    Object.keys(mates).forEach(a =>
      mates[a].forEach(b => out.push(`${a} → ${b}`))
    );
    return out;
  }, [mates]);

  /* ======================
     RENDER
  ====================== */
  return (
    <div className="app">
      <h1>KAD Kings</h1>
      <h2>{current}’s Turn</h2>

      {phase.type === "WATERFALL_READY" && (
        <div className="status">
          {phase.owner} — tap players to READY, then tap yourself to START
        </div>
      )}

      <div
        className={`card ${phase.type !== "IDLE" ? "locked" : ""}`}
        onClick={draw}
      >
        {card ? (
          <>
            <div className="rank">{card}</div>
            <div className="rule">{CARD_RULES[rank]}</div>
          </>
        ) : (
          "DRAW"
        )}
      </div>

      <div className="players">
        {PLAYERS.map(p => {
          const isTurn = p === current;
          const isActive = p === phase.owner;
          const isReady = ready.has(p);

          return (
            <div
              key={p}
              className={`player
                ${isTurn ? "turn" : ""}
                ${isActive ? "active" : ""}
                ${drinkFlash.includes(p) ? "drink" : ""}
                ${isReady ? "ready" : ""}
              `}
              onClick={() =>
                phase.type === "WATERFALL_READY"
                  ? tapStartWaterfall(p)
                  : tapPlayer(p)
              }
            >
              <div className="name">{p}</div>

              <div className="badges">
                {p === thumbHolder && <span className="badge j">J</span>}
                {p === heavenHolder && <span className="badge h">7</span>}
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
