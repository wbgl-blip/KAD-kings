import { useEffect, useMemo, useState } 
from "react";
import "./index.css";

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
  K: "Make a Rule"
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

  const [thumb, setThumb] = useState(null);
  const [heaven, setHeaven] = useState(null);
  const [queen, setQueen] = useState(null);

  const [reaction, setReaction] = useState(null);

  const [phase, setPhase] = useState({
    type: "IDLE",
    turnOwner: null,
    activePlayer: null
  });

  const [drinkFlash, setDrinkFlash] = useState([]);

  const current = PLAYERS[turn];
  const rank = card ? rankOf(card) : null;

  function drink(name) {
    setBeers(b => ({ ...b, [name]: b[name] + 1 }));
    setDrinkFlash(f => [...f, name]);
    setTimeout(
      () => setDrinkFlash(f => f.filter(n => n !== name)),
      5000
    );
  }

  function propagateDrink(name, visited = new Set()) {
    if (visited.has(name)) return;
    visited.add(name);
    drink(name);
    mates[name]?.forEach(m => propagateDrink(m, visited));
  }

  function draw() {
    if (phase.type !== "IDLE") return;
    const [c, ...rest] = deck;
    setDeck(rest);
    setCard(c);

    const r = rankOf(c);

    if (r === "8") {
      setPhase({ type: "SELECT_MATE", turnOwner: current, activePlayer: current });
    } else if (r === "2") {
      setPhase({ type: "SELECT_DRINK", turnOwner: current, activePlayer: current });
    } else if (r === "7") {
      setHeaven(current);
      setPhase({ type: "WAIT_REACTION", turnOwner: current, activePlayer: current });
    } else if (r === "J") {
      setThumb(current);
      setPhase({ type: "WAIT_REACTION", turnOwner: current, activePlayer: current });
    } else {
      setPhase({ type: "IDLE", turnOwner: null, activePlayer: null });
    }

    setTurn(t => (t + 1) % PLAYERS.length);
  }

  function startReaction() {
    setReaction(new Set());
    setPhase({ type: "REACTION", turnOwner: null, activePlayer: null });
  }

  function tapPlayer(name) {

    // Reaction taps
    if (reaction) {
      if (reaction.has(name)) return;
      const next = new Set(reaction);
      next.add(name);
      if (next.size === PLAYERS.length - 1) {
        propagateDrink(name);
        setReaction(null);
        setPhase({ type: "IDLE", turnOwner: null, activePlayer: null });
      } else {
        setReaction(next);
      }
      return;
    }

    // Phase-locked actions
    if (phase.activePlayer && name !== phase.activePlayer) return;

    if (phase.type === "SELECT_MATE") {
      if (name !== phase.turnOwner) {
        setMates(m => ({
          ...m,
          [phase.turnOwner]: [...m[phase.turnOwner], name]
        }));
        setPhase({ type: "IDLE", turnOwner: null, activePlayer: null });
      }
      return;
    }

    if (phase.type === "SELECT_DRINK") {
      propagateDrink(name);
      setPhase({ type: "IDLE", turnOwner: null, activePlayer: null });
      return;
    }

    if (phase.type === "WAIT_REACTION") {
      startReaction();
      return;
    }

    propagateDrink(name);
  }

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
              ${p === phase.activePlayer ? "active" : ""}
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
          {mateChains.map((m, i) => <div key={i}>🤝 {m}</div>)}
        </div>
      )}

      <button className="reset" onClick={() => window.location.reload()}>
        Reset
      </button>
    </div>
  );
}
