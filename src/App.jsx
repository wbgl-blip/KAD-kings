import { useMemo, useState } from "react";
import "./styles.css";

const PLAYERS = ["Beau", "Sean", "Mike", "Emily", "Jess", "Alex", "Kyle", "Sam"];

const CARD_RULES = {
  A: "Waterfall",
  2: "Pick someone to drink",
  3: "Me",
  4: "Whores (Everyone drinks)",
  5: "Guys",
  6: "Dicks (Everyone drinks)",
  7: "Heaven",
  8: "Pick a Mate",
  9: "Rhyme",
  10: "Categories",
  J: "Thumbmaster",
  Q: "Question Master",
  K: "Make a Rule",
};

const suits = ["♠", "♥", "♦", "♣"];
const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];

function buildDeck() {
  const d = [];
  ranks.forEach((r) => suits.forEach((s) => d.push(`${r}${s}`)));
  for (let i = d.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [d[i], d[j]] = [d[j], d[i]];
  }
  return d;
}

const rankOf = (c) => c.replace(/[^A-Z0-9]/g, "");

export default function App() {
  const [deck, setDeck] = useState(buildDeck);
  const [card, setCard] = useState(null);
  const [turn, setTurn] = useState(0);

  const [beers, setBeers] = useState(
    Object.fromEntries(PLAYERS.map((p) => [p, 0]))
  );

  // Directed mates graph: mates[A] = [B,C] means B and C drink whenever A drinks.
  const [mates, setMates] = useState(
    Object.fromEntries(PLAYERS.map((p) => [p, []]))
  );

  // IDLE | SELECT_MATE | SELECT_DRINK | REACTION
  const [phase, setPhase] = useState({ type: "IDLE", owner: null });

  // Reaction tracking: Set of players (excluding owner) who have reacted
  const [reaction, setReaction] = useState(new Set());

  // Players currently flashing "YOU DRINK"
  const [drinkFlash, setDrinkFlash] = useState([]);

  const current = PLAYERS[turn];
  const rank = card ? rankOf(card) : null;

  /* ======================
     DRINK + PROPAGATION
  ====================== */
  function drink(name) {
    setBeers((b) => ({ ...b, [name]: (b[name] ?? 0) + 1 }));

    setDrinkFlash((f) => (f.includes(name) ? f : [...f, name]));
    setTimeout(() => {
      setDrinkFlash((f) => f.filter((n) => n !== name));
    }, 5000);
  }

  function propagateDrink(name, visited = new Set()) {
    if (visited.has(name)) return;
    visited.add(name);

    drink(name);
    (mates[name] || []).forEach((m) => propagateDrink(m, visited));
  }

  /* ======================
     DRAW CARD
  ====================== */
  function draw() {
    if (phase.type !== "IDLE") return;
    if (deck.length === 0) return;

    const drawer = current;

    const [c, ...rest] = deck;
    setDeck(rest);
    setCard(c);

    const r = rankOf(c);

    if (r === "8") {
      setPhase({ type: "SELECT_MATE", owner: drawer });
    } else if (r === "2") {
      setPhase({ type: "SELECT_DRINK", owner: drawer });
    } else if (r === "7" || r === "J") {
      // Reaction begins immediately; owner does NOT react.
      setReaction(new Set());
      setPhase({ type: "REACTION", owner: drawer });
    } else {
      setPhase({ type: "IDLE", owner: null });
    }

    setTurn((t) => (t + 1) % PLAYERS.length);
  }

  /* ======================
     TAP PLAYER
  ====================== */
  function tapPlayer(name) {
    // REACTION MODE
    if (phase.type === "REACTION") {
      if (name === phase.owner) return; // owner never reacts
      if (reaction.has(name)) return;

      const next = new Set(reaction);
      next.add(name);

      // Everyone except owner must react
      if (next.size === PLAYERS.length - 1) {
        // Last reactor drinks (with mate propagation)
        propagateDrink(name);

        setReaction(new Set());
        setPhase({ type: "IDLE", owner: null });
      } else {
        setReaction(next);
      }
      return;
    }

    // If a phase requires an owner decision, only the owner can act.
    if (phase.owner && name !== phase.owner) return;

    if (phase.type === "SELECT_MATE") {
      if (name !== phase.owner) {
        setMates((m) => {
          const existing = m[phase.owner] || [];
          if (existing.includes(name)) return m; // no dupes
          return { ...m, [phase.owner]: [...existing, name] };
        });
        setPhase({ type: "IDLE", owner: null });
      }
      return;
    }

    if (phase.type === "SELECT_DRINK") {
      propagateDrink(name);
      setPhase({ type: "IDLE", owner: null });
      return;
    }

    // Normal mode
    propagateDrink(name);
  }

  /* ======================
     MATE LIST (direct edges)
  ====================== */
  const mateChains = useMemo(() => {
    const out = [];
    Object.keys(mates).forEach((a) => {
      (mates[a] || []).forEach((b) => out.push(`${a} → ${b}`));
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
            <div className="rule">{CARD_RULES[rank] || ""}</div>
          </>
        ) : (
          "DRAW"
        )}
      </div>

      <div className="players">
        {PLAYERS.map((p) => (
          <div
            key={p}
            className={`player
              ${p === current ? "turn" : ""}
              ${p === phase.owner ? "active" : ""}
              ${drinkFlash.includes(p) ? "drink" : ""}
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
