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
  7: "Heaven (Reaction)",
  8: "Pick a Mate",
  9: "Rhyme",
  10: "Categories",
  J: "Thumbmaster (Reaction)",
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

  /**
   * PHASES
   * IDLE
   * SELECT_MATE
   * SELECT_DRINK
   * HOLD_REACTION
   * REACTION
   * WATERFALL_READY
   * WATERFALL_ACTIVE
   */
  const [phase, setPhase] = useState({ type: "IDLE", owner: null });

  const [reactionTaps, setReactionTaps] = useState(new Set());
  const [waterfallReady, setWaterfallReady] = useState(new Set());
  const [drinkFlash, setDrinkFlash] = useState([]);

  const current = PLAYERS[turn];
  const rank = card ? rankOf(card) : null;

  /* ======================
     DRINK + PROPAGATION
  ====================== */
  function drink(name) {
    setBeers(b => ({ ...b, [name]: b[name] + 1 }));
    setDrinkFlash(f => (f.includes(name) ? f : [...f, name]));
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
     DRAW CARD
  ====================== */
  function draw() {
    if (phase.type !== "IDLE") return;
    if (!deck.length) return;

    const drawer = current;
    const [c, ...rest] = deck;

    setDeck(rest);
    setCard(c);

    const r = rankOf(c);

    if (r === "A") {
      setWaterfallReady(new Set([drawer]));
      setPhase({ type: "WATERFALL_READY", owner: drawer });
      return; // DO NOT ADVANCE TURN
    }

    if (r === "8") {
      setPhase({ type: "SELECT_MATE", owner: drawer });
    } else if (r === "2") {
      setPhase({ type: "SELECT_DRINK", owner: drawer });
    } else if (r === "7" || r === "J") {
      setReactionTaps(new Set());
      setPhase({ type: "HOLD_REACTION", owner: drawer });
    } else {
      setPhase({ type: "IDLE", owner: null });
    }

    setTurn(t => (t + 1) % PLAYERS.length);
  }

  /* ======================
     TAP PLAYER
  ====================== */
  function tapPlayer(name) {

    /* ----- WATERFALL READY ----- */
    if (phase.type === "WATERFALL_READY") {
      const next = new Set(waterfallReady);
      next.add(name);
      setWaterfallReady(next);

      if (next.size === PLAYERS.length) {
        setPhase({ type: "WATERFALL_ACTIVE", owner: phase.owner });
      }
      return;
    }

    /* ----- WATERFALL ACTIVE ----- */
    if (phase.type === "WATERFALL_ACTIVE") {
      if (name !== phase.owner) return;
      setWaterfallReady(new Set());
      setPhase({ type: "IDLE", owner: null });
      setTurn(t => (t + 1) % PLAYERS.length);
      return;
    }

    /* ----- HOLDER STARTS REACTION ----- */
    if (phase.type === "HOLD_REACTION") {
      if (name !== phase.owner) return;
      setReactionTaps(new Set());
      setPhase({ type: "REACTION", owner: phase.owner });
      return;
    }

    /* ----- REACTION RACE ----- */
    if (phase.type === "REACTION") {
      if (name === phase.owner) return;
      if (reactionTaps.has(name)) return;

      const eligible = PLAYERS.filter(p => p !== phase.owner);
      const next = new Set(reactionTaps);
      next.add(name);

      if (next.size === eligible.length - 1) {
        const loser = eligible.find(p => !next.has(p));
        propagateDrink(loser);
        setReactionTaps(new Set());
        setPhase({ type: "IDLE", owner: null });
      } else {
        setReactionTaps(next);
      }
      return;
    }

    /* ----- OWNER-ONLY PHASES ----- */
    if (phase.owner && name !== phase.owner) return;

    if (phase.type === "SELECT_MATE") {
      if (name !== phase.owner) {
        setMates(m => ({
          ...m,
          [phase.owner]: m[phase.owner].includes(name)
            ? m[phase.owner]
            : [...m[phase.owner], name],
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

    propagateDrink(name);
  }

  /* ======================
     MATES DISPLAY
  ====================== */
  const mateChains = useMemo(() => {
    const out = [];
    Object.keys(mates).forEach(a => {
      mates[a].forEach(b => out.push(`${a} → ${b}`));
    });
    return out;
  }, [mates]);

  return (
    <div className="app">
      <h1>KAD Kings</h1>
      <h2>{current}’s Turn</h2>

      {phase.type === "WATERFALL_READY" && (
        <div className="status">
          Waterfall — everyone tap READY
        </div>
      )}

      {phase.type === "WATERFALL_ACTIVE" && (
        <div className="status">
          Waterfall active — {phase.owner} ends it
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
        ) : "DRAW"}
      </div>

      <div className="players">
        {PLAYERS.map(p => (
          <div
            key={p}
            className={`player
              ${p === current ? "turn" : ""}
              ${p === phase.owner ? "active" : ""}
              ${drinkFlash.includes(p) ? "drink" : ""}
              ${waterfallReady.has(p) ? "ready" : ""}
            `}
            onClick={() => tapPlayer(p)}
          >
            <div className="name">{p}</div>
            <div className="beer">🍺 {beers[p]}</div>
          </div>
        ))}
      </div>

      {mateChains.length > 0 && (
        <div className="mates">
          {mateChains.map((m, i) => <div key={i}>🤝 {m}</div>)}
        </div>
      )}

      <button className="reset" onClick={() => window.location.reload()}>
        Reset
      </button>
    </div>
  );
}
