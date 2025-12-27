import { useMemo, useState, useEffect } from "react";
import "./styles.css";

const PLAYERS = ["Beau", "Sean", "Mike", "Emily", "Jess", "Alex", "Kyle", "Sam"];

const CARD_RULES = {
  A: "Waterfall",
  2: "Pick someone to drink",
  3: "Me",
  4: "Everyone drinks",
  5: "Guys drink",
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

  // mates[A] = [B,C] → B & C drink whenever A drinks
  const [mates, setMates] = useState(
    Object.fromEntries(PLAYERS.map(p => [p, []]))
  );

  // IDLE | SELECT_MATE | SELECT_DRINK | WAIT_REACTION | REACTION
  const [phase, setPhase] = useState({ type: "IDLE", owner: null });

  const [reaction, setReaction] = useState(new Set());
  const [drinkFlash, setDrinkFlash] = useState([]);

  // Waterfall readiness (Ace)
  // null | { starter: string, ready: Set<string>, go: boolean }
  const [waterfall, setWaterfall] = useState(null);

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

    const [c, ...rest] = deck;
    setDeck(rest);
    setCard(c);

    const drawer = current;
    const r = rankOf(c);

    if (r === "A") {
      setWaterfall({
        starter: drawer,
        ready: new Set(),
        go: false,
      });
      setPhase({ type: "IDLE", owner: null });
    } else if (r === "8") {
      setPhase({ type: "SELECT_MATE", owner: drawer });
    } else if (r === "2") {
      setPhase({ type: "SELECT_DRINK", owner: drawer });
    } else if (r === "7" || r === "J") {
      setPhase({ type: "WAIT_REACTION", owner: drawer });
    } else {
      setPhase({ type: "IDLE", owner: null });
    }

    setTurn(t => (t + 1) % PLAYERS.length);
  }

  /* ======================
     TAP PLAYER
  ====================== */
  function tapPlayer(name) {

    /* 🟦 WATERFALL READY MODE */
    if (waterfall && !waterfall.go) {
      setWaterfall(w => {
        if (w.ready.has(name)) return w;

        const nextReady = new Set(w.ready);
        nextReady.add(name);

        if (nextReady.size === PLAYERS.length) {
          return { ...w, ready: nextReady, go: true };
        }

        return { ...w, ready: nextReady };
      });
      return;
    }

    /* 🟠 OWNER STARTS REACTION */
    if (phase.type === "WAIT_REACTION") {
      if (name !== phase.owner) return;
      setReaction(new Set());
      setPhase({ type: "REACTION", owner: phase.owner });
      return;
    }

    /* 🔴 REACTION MODE */
    if (phase.type === "REACTION") {
      if (name === phase.owner) return;
      if (reaction.has(name)) return;

      const next = new Set(reaction);
      next.add(name);

      if (next.size === PLAYERS.length - 1) {
        propagateDrink(name);
        setReaction(new Set());
        setPhase({ type: "IDLE", owner: null });
      } else {
        setReaction(next);
      }
      return;
    }

    /* 🟡 SELECT MATE */
    if (phase.type === "SELECT_MATE") {
      if (name === phase.owner) return;

      setMates(m => {
        if (m[phase.owner].includes(name)) return m;
        return {
          ...m,
          [phase.owner]: [...m[phase.owner], name],
        };
      });

      setPhase({ type: "IDLE", owner: null });
      return;
    }

    /* 🟡 SELECT DRINK */
    if (phase.type === "SELECT_DRINK") {
      propagateDrink(name);
      setPhase({ type: "IDLE", owner: null });
      return;
    }

    /* 🟢 NORMAL DRINK */
    propagateDrink(name);
  }

  /* ======================
     AUTO-CLEAR WATERFALL
  ====================== */
  useEffect(() => {
    if (waterfall?.go) {
      const t = setTimeout(() => setWaterfall(null), 2000);
      return () => clearTimeout(t);
    }
  }, [waterfall]);

  /* ======================
     STATUS TEXT
  ====================== */
  const statusText = (() => {
    if (waterfall && !waterfall.go) {
      return `Waterfall — tap READY (${waterfall.ready.size}/${PLAYERS.length})`;
    }
    if (waterfall?.go) {
      return `GO — ${waterfall.starter} starts!`;
    }
    switch (phase.type) {
      case "SELECT_MATE":
        return `${phase.owner} — choose a mate`;
      case "SELECT_DRINK":
        return `${phase.owner} — choose who drinks`;
      case "WAIT_REACTION":
        return `${phase.owner} — tap yourself to start`;
      case "REACTION":
        return "LAST TO TAP DRINKS";
      default:
        return "";
    }
  })();

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

  return (
    <div className="app">
      <h1>KAD Kings</h1>
      <h2>{current}’s Turn</h2>
      {statusText && <p className="status">{statusText}</p>}

      <div className="card" onClick={draw}>
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
              ${waterfall?.ready.has(p) ? "ready" : ""}
              ${waterfall?.go && p === waterfall.starter ? "waterfall-start" : ""}
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
