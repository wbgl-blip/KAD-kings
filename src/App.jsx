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

function leftOf(name) {
  const i = PLAYERS.indexOf(name);
  return PLAYERS[(i + 1) % PLAYERS.length];
}

export default function App() {
  const [deck, setDeck] = useState(buildDeck);
  const [card, setCard] = useState(null);
  const [turn, setTurn] = useState(0);

  const [beers, setBeers] = useState(
    Object.fromEntries(PLAYERS.map(p => [p, 0]))
  );

  // Directed mates graph: mates[A] = [B,C] => B and C drink when A drinks
  const [mates, setMates] = useState(
    Object.fromEntries(PLAYERS.map(p => [p, []]))
  );

  /**
   * PHASES
   * IDLE
   * SELECT_MATE
   * SELECT_DRINK
   * REACTION
   * WATERFALL_READY
   * WATERFALL_ACTIVE
   */
  const [phase, setPhase] = useState({ type: "IDLE", owner: null });

  // Persistent powers (transfer only when next same card drawn)
  const [thumbHolder, setThumbHolder] = useState(null);   // J
  const [heavenHolder, setHeavenHolder] = useState(null); // 7

  // Reaction info
  const [reaction, setReaction] = useState({
    active: false,
    type: null,     // "J" | "7"
    owner: null,    // holder who started it (excluded)
    taps: new Set() // tapped eligible players
  });

  // Waterfall state
  const [waterfall, setWaterfall] = useState({
    active: false,     // any waterfall mode
    started: false,    // actually started
    starter: null,     // who drew the Ace (keeps turn)
    ready: new Set(),  // players who are ready
  });

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
    (mates[name] || []).forEach(m => propagateDrink(m, visited));
  }

  /* ======================
     DRAW CARD
  ====================== */
  function draw() {
    if (phase.type !== "IDLE") return;
    if (reaction.active) return;
    if (waterfall.active) return;
    if (!deck.length) return;

    const drawer = current;
    const [c, ...rest] = deck;

    setDeck(rest);
    setCard(c);

    const r = rankOf(c);

    // A: Waterfall locks turn until done (turn does NOT advance now)
    if (r === "A") {
      setWaterfall({
        active: true,
        started: false,
        starter: drawer,
        ready: new Set([drawer]), // starter auto-ready
      });
      setPhase({ type: "WATERFALL_READY", owner: drawer });
      return;
    }

    // J / 7: transfer power only (NO phase, NO reaction)
    if (r === "J") setThumbHolder(drawer);
    if (r === "7") setHeavenHolder(drawer);

    // 8: select mate (additive)
    if (r === "8") {
      setPhase({ type: "SELECT_MATE", owner: drawer });
      setTurn(t => (t + 1) % PLAYERS.length);
      return;
    }

    // 2: select drink target
    if (r === "2") {
      setPhase({ type: "SELECT_DRINK", owner: drawer });
      setTurn(t => (t + 1) % PLAYERS.length);
      return;
    }

    // Everything else: no enforced action
    setPhase({ type: "IDLE", owner: null });
    setTurn(t => (t + 1) % PLAYERS.length);
  }

  /* ======================
     START REACTION (MANUAL)
  ====================== */
  function startReaction(type, owner) {
    // type: "J" | "7"
    setReaction({
      active: true,
      type,
      owner,
      taps: new Set(),
    });
    setPhase({ type: "REACTION", owner }); // for visuals ("SELECTING" on owner)
  }

  /* ======================
     TAP PLAYER
  ====================== */
  function tapPlayer(name) {
    /* -------- WATERFALL READY -------- */
    if (phase.type === "WATERFALL_READY") {
      // Ready-up should be a self-confirmation: tap your own tile
      const isSelfTap = true; // UI is local; keep simple: allow tap any tile? NO. Self only is cleaner.
      if (isSelfTap && name !== name) return; // no-op (kept for clarity)

      setWaterfall(w => {
        const next = new Set(w.ready);
        next.add(name);
        const allReady = next.size === PLAYERS.length;
        return { ...w, ready: next, started: w.started, active: w.active };
      });

      // When all ready, starter must tap themselves to START (handled below)
      return;
    }

    /* -------- WATERFALL ACTIVE / START -------- */
    if (phase.type === "WATERFALL_ACTIVE") {
      // Starter taps self to END waterfall
      if (name !== waterfall.starter) return;

      setWaterfall({ active: false, started: false, starter: null, ready: new Set() });
      setPhase({ type: "IDLE", owner: null });
      // NOW advance turn once (starter kept the turn until done)
      setTurn(t => (t + 1) % PLAYERS.length);
      return;
    }

    /* -------- REACTION ACTIVE -------- */
    if (reaction.active && phase.type === "REACTION") {
      if (name === reaction.owner) return; // owner excluded
      if (reaction.taps.has(name)) return;

      const eligible = PLAYERS.filter(p => p !== reaction.owner);
      const next = new Set(reaction.taps);
      next.add(name);

      // AUTO-LOSE: if only one eligible hasn't tapped
      if (next.size === eligible.length - 1) {
        const loser = eligible.find(p => !next.has(p));
        propagateDrink(loser);

        // End reaction
        setReaction({ active: false, type: null, owner: null, taps: new Set() });
        setPhase({ type: "IDLE", owner: null });
      } else {
        setReaction(r => ({ ...r, taps: next }));
      }
      return;
    }

    /* -------- MANUAL POWER TRIGGERS (ONLY IN IDLE) -------- */
    if (phase.type === "IDLE" && !waterfall.active && !reaction.active) {
      // Holder taps self to start
      if (name === thumbHolder) {
        startReaction("J", name);
        return;
      }
      if (name === heavenHolder) {
        startReaction("7", name);
        return;
      }
    }

    /* -------- SELECT MATE -------- */
    if (phase.type === "SELECT_MATE") {
      if (name !== phase.owner) {
        setMates(m => {
          const existing = m[phase.owner] || [];
          if (existing.includes(name)) return m;
          return { ...m, [phase.owner]: [...existing, name] };
        });
        setPhase({ type: "IDLE", owner: null });
      }
      return;
    }

    /* -------- SELECT DRINK -------- */
    if (phase.type === "SELECT_DRINK") {
      propagateDrink(name);
      setPhase({ type: "IDLE", owner: null });
      return;
    }

    /* -------- NORMAL DRINK -------- */
    propagateDrink(name);
  }

  /* ======================
     WATERFALL START CHECK
  ====================== */
  const allReady = waterfall.active && waterfall.ready.size === PLAYERS.length;

  function tapStartWaterfall(name) {
    if (phase.type !== "WATERFALL_READY") return;
    if (!allReady) return;
    if (name !== waterfall.starter) return;

    setWaterfall(w => ({ ...w, started: true }));
    setPhase({ type: "WATERFALL_ACTIVE", owner: waterfall.starter });
  }

  /* ======================
     STATUS TEXT
  ====================== */
  const statusText = (() => {
    if (phase.type === "WATERFALL_READY") {
      if (!allReady) return `Waterfall — READY (${waterfall.ready.size}/${PLAYERS.length})`;
      return `${waterfall.starter} — tap yourself to START Waterfall`;
    }
    if (phase.type === "WATERFALL_ACTIVE") {
      return `Waterfall active — ${waterfall.starter} taps to end`;
    }
    if (reaction.active && phase.type === "REACTION") {
      const eligible = PLAYERS.length - 1;
      return `${reaction.type} Reaction — ${reaction.taps.size}/${eligible} tapped (last auto-loses)`;
    }
    if (phase.type === "SELECT_MATE") return `${phase.owner} — choose a mate`;
    if (phase.type === "SELECT_DRINK") return `${phase.owner} — choose who drinks`;
    if (thumbHolder || heavenHolder) {
      const parts = [];
      if (thumbHolder) parts.push(`J: ${thumbHolder}`);
      if (heavenHolder) parts.push(`7: ${heavenHolder}`);
      return parts.join("  •  ");
    }
    return "";
  })();

  /* ======================
     MATES DISPLAY
  ====================== */
  const mateChains = useMemo(() => {
    const out = [];
    Object.keys(mates).forEach(a => {
      (mates[a] || []).forEach(b => out.push(`${a} → ${b}`));
    });
    return out;
  }, [mates]);

  /* ======================
     RENDER
  ====================== */
  return (
    <div className="app">
      <h1>KAD Kings</h1>
      <h2>{current}’s Turn</h2>
      {statusText && <div className="status">{statusText}</div>}

      <div
        className={`card ${
          (phase.type !== "IDLE" && phase.type !== "WATERFALL_READY") ||
          reaction.active ||
          waterfall.active
            ? "locked"
            : ""
        }`}
        onClick={draw}
      >
        {card ? (
          <>
            <div className="rank">{card}</div>
            <div className="rule">{CARD_RULES[rank] || ""}</div>
          </>
        ) : (
          "DRAW"
        )}
      </div>

      <div className="players">
        {PLAYERS.map(p => {
          const isTurn = p === current;

          const isSelecting =
            (phase.type === "SELECT_MATE" && p === phase.owner) ||
            (phase.type === "SELECT_DRINK" && p === phase.owner) ||
            (phase.type === "REACTION" && reaction.active && p === reaction.owner) ||
            (phase.type === "WATERFALL_READY" && p === waterfall.starter && allReady) ||
            (phase.type === "WATERFALL_ACTIVE" && p === waterfall.starter);

          const isReady = waterfall.active && waterfall.ready.has(p);

          return (
            <div
              key={p}
              className={`player
                ${isTurn ? "turn" : ""}
                ${isSelecting ? "active" : ""}
                ${drinkFlash.includes(p) ? "drink" : ""}
                ${isReady ? "ready" : ""}
              `}
              onClick={() => {
                // Special: starter starts waterfall by tapping self AFTER all ready
                if (phase.type === "WATERFALL_READY" && allReady && p === waterfall.starter) {
                  tapStartWaterfall(p);
                  return;
                }
                tapPlayer(p);
              }}
            >
              <div className="name">{p}</div>

<div className="badges">
  {p === thumbHolder && <span className="badge j">J</span>}
  {p === heavenHolder && <span className="badge h">7</span>}
</div>

<div className="beer">🍺 {beers[p]}</div>
<div className="left">◀ Left: {leftOf(p)}</div>
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
