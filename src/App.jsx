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
  7: "Heaven (Power)",
  8: "Pick a Mate",
  9: "Rhyme",
  10: "Categories",
  J: "Thumbmaster (Power)",
  Q: "Question Master",
  K: "Make a Rule",
};

const suits = ["♠", "♥", "♦", "♣"];
const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
const rankOf = c => c.replace(/[^A-Z0-9]/g, "");

function buildDeck() {
  const d = [];
  ranks.forEach(r => suits.forEach(s => d.push(`${r}${s}`)));
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

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

  const [thumbHolder, setThumbHolder] = useState(null);
  const [heavenHolder, setHeavenHolder] = useState(null);

  const [phase, setPhase] = useState({
    type: "IDLE", // IDLE | SELECT_MATE | SELECT_DRINK | WATERFALL_READY | WATERFALL_RUNNING | REACTION
    owner: null
  });

  const [reaction, setReaction] = useState({
    active: false,
    owner: null,
    taps: new Set()
  });

  const [waterfall, setWaterfall] = useState({
    active: false,
    started: false,
    starter: null,
    ready: new Set()
  });

  const [drinkFlash, setDrinkFlash] = useState([]);

  const current = PLAYERS[turn];
  const rank = card ? rankOf(card) : null;

  /* ======================
     HELPERS
  ====================== */
  const leftOf = p =>
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
    const drawer = current;
    const r = rankOf(c);

    setDeck(rest);
    setCard(c);

    if (r === "A") {
      setWaterfall({
        active: true,
        started: false,
        starter: drawer,
        ready: new Set([drawer])
      });
      setPhase({ type: "WATERFALL_READY", owner: drawer });
      return; // 🔒 turn does NOT advance
    }

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
     START REACTION
  ====================== */
  function startReaction(owner) {
    setReaction({ active: true, owner, taps: new Set() });
    setPhase({ type: "REACTION", owner });
  }

  /* ======================
     TAP PLAYER
  ====================== */
  function tapPlayer(name) {

    /* ---- WATERFALL READY ---- */
    if (phase.type === "WATERFALL_READY") {
      setWaterfall(w => {
        const next = new Set(w.ready);
        next.add(name);
        return { ...w, ready: next };
      });
      return;
    }

    /* ---- WATERFALL RUNNING ---- */
    if (phase.type === "WATERFALL_RUNNING") {
      if (name !== waterfall.starter) return;
      setWaterfall({ active: false, started: false, starter: null, ready: new Set() });
      setPhase({ type: "IDLE", owner: null });
      setTurn(t => (t + 1) % PLAYERS.length);
      return;
    }

    /* ---- START J / 7 ---- */
    if (phase.type === "IDLE") {
      if (name === thumbHolder) return startReaction(name);
      if (name === heavenHolder) return startReaction(name);
    }

    /* ---- REACTION ---- */
    if (phase.type === "REACTION") {
      if (name === reaction.owner) return;
      if (reaction.taps.has(name)) return;

      const eligible = PLAYERS.filter(p => p !== reaction.owner);
      const next = new Set(reaction.taps);
      next.add(name);

      if (next.size === eligible.length - 1) {
        const loser = eligible.find(p => !next.has(p));
        propagateDrink(loser);
        setReaction({ active: false, owner: null, taps: new Set() });
        setPhase({ type: "IDLE", owner: null });
      } else {
        setReaction(r => ({ ...r, taps: next }));
      }
      return;
    }

    /* ---- OWNER-ONLY ---- */
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

    propagateDrink(name);
  }

  /* ======================
     WATERFALL START
  ====================== */
  const allReady = waterfall.active && waterfall.ready.size === PLAYERS.length;

  function startWaterfall(p) {
    if (!allReady) return;
    if (p !== waterfall.starter) return;
    setPhase({ type: "WATERFALL_RUNNING", owner: p });
  }

  /* ======================
     MATES DISPLAY
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
          Waterfall — READY ({waterfall.ready.size}/{PLAYERS.length}) — {waterfall.starter} taps self to START
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
        {PLAYERS.map(p => {
          const isActive =
            p === phase.owner ||
            (phase.type === "WATERFALL_READY" && allReady && p === waterfall.starter);

          const isReady = waterfall.ready.has(p);

          return (
            <div
              key={p}
              className={`player
                ${p === current ? "turn" : ""}
                ${isActive ? "active" : ""}
                ${drinkFlash.includes(p) ? "drink" : ""}
                ${isReady ? "ready" : ""}
              `}
              onClick={() =>
                phase.type === "WATERFALL_READY" && allReady && p === waterfall.starter
                  ? startWaterfall(p)
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
