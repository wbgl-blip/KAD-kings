import { useMemo, useState } from "react";
import "./styles.css";

const PLAYERS = ["Beau", "Sean", "Mike", "Emily", "Jess", "Alex", "Kyle", "Sam"];

const CARD_RULES = {
  "2": ["Pick someone to drink"],
  "4": ["Whores — everyone drinks"],
  "6": ["Dicks — everyone drinks"],
  "7": ["Heaven"],
  "8": ["Pick a Mate"],
  J: ["Thumbmaster"],
  Q: ["Question Master"],
};

function buildDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
  const d = [];
  for (const r of ranks) for (const s of suits) d.push(`${r}${s}`);
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

  const [thumb, setThumb] = useState(null);
  const [heaven, setHeaven] = useState(null);
  const [queen, setQueen] = useState(null);

  const [reaction, setReaction] = useState(null);
  const [selectMate, setSelectMate] = useState(null);

  const [beers, setBeers] = useState(
    Object.fromEntries(PLAYERS.map(p => [p, 0]))
  );

  const [mates, setMates] = useState(
    Object.fromEntries(PLAYERS.map(p => [p, []]))
  );

  const current = PLAYERS[turn];
  const currentRank = card ? rankOf(card) : null;

  function drink(name) {
    setBeers(b => ({ ...b, [name]: b[name] + 1 }));
  }

  function draw() {
    if (reaction || selectMate || deck.length === 0) return;

    setDeck(d => {
      const [c, ...rest] = d;
      const r = rankOf(c);
      setCard(c);

      if (r === "J") setThumb(current);
      if (r === "7") setHeaven(current);
      if (r === "Q") setQueen(current);
      if (r === "8") setSelectMate(current);

      setTurn(t => (t + 1) % PLAYERS.length);
      return rest;
    });
  }

  function startReaction(type) {
    setReaction({ type, reacted: new Set() });
  }

  function tapPlayer(name) {
    // 🔒 1. MATE SELECTION
    if (selectMate) {
      if (name !== selectMate) {
        setMates(m => ({
          ...m,
          [selectMate]: [...m[selectMate], name],
        }));
      }
      setSelectMate(null);
      return;
    }

    // 🔒 2. REACTION MODE
    if (reaction) {
      if (reaction.reacted.has(name)) return;

      const next = new Set(reaction.reacted);
      next.add(name);

      if (next.size === PLAYERS.length - 1) {
        drink(name);
        setReaction(null);
      } else {
        setReaction({ ...reaction, reacted: next });
      }
      return;
    }

    // 🔒 3. START REACTION (holder taps once)
    if (name === thumb) return startReaction("J");
    if (name === heaven) return startReaction("7");

    // 🔒 4. NORMAL DRINK
    drink(name);
  }

  const mateChains = useMemo(() => {
    const chains = [];
    const visited = new Set();

    function dfs(node, path) {
      if (visited.has(node)) return;
      visited.add(node);
      const next = mates[node];
      if (!next.length) chains.push(path);
      else next.forEach(n => dfs(n, [...path, n]));
    }

    Object.keys(mates).forEach(p => mates[p].length && dfs(p, [p]));
    return chains;
  }, [mates]);

  return (
    <div className="app">
      <h1>KAD Kings</h1>

      <div className="mode">
        {selectMate && <>🤝 {selectMate} — PICK A MATE</>}
        {!selectMate && reaction && <>⚡ REACTION — TAP FAST</>}
        {!selectMate && !reaction && <>{current}’s Turn</>}
      </div>

      <div className="card" onClick={draw}>
        <div className="card-face">{card ?? "—"}</div>
        {CARD_RULES[currentRank]?.map((r, i) => (
          <div key={i} className="rule">{r}</div>
        ))}
      </div>

      <div className="players">
        {PLAYERS.map(p => {
          const isTurn = p === current && !selectMate && !reaction;
          const selectable = selectMate && p !== selectMate;

          return (
            <button
              key={p}
              className={`player
                ${isTurn ? "turn" : ""}
                ${selectMate && p === selectMate ? "disabled" : ""}
                ${selectable ? "selectable" : ""}
              `}
              onClick={() => tapPlayer(p)}
            >
              {isTurn && <div className="turn-badge">YOUR TURN</div>}
              <div className="name">{p}</div>
              <div className="beer">🍺 {beers[p]}</div>
              <div className="roles">
                {p === thumb && "J "}
                {p === heaven && "7 "}
                {p === queen && "Q"}
              </div>
            </button>
          );
        })}
      </div>

      <button className="reset" onClick={() => window.location.reload()}>
        Reset
      </button>
    </div>
  );
}
