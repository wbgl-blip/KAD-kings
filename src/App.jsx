import { useMemo, useState } from "react";

const PLAYERS = ["Beau", "Sean", "Mike", "Emily", "Jess", "Alex", "Kyle", "Sam"];

function buildDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
  const deck = [];
  for (const r of ranks) for (const s of suits) deck.push(`${r}${s}`);
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}
const rankOf = c => c.replace(/[^A-Z0-9]/g, "");

export default function App() {
  const [deck, setDeck] = useState(buildDeck);
  const [card, setCard] = useState(null);
  const [turn, setTurn] = useState(0);
  const [drawing, setDrawing] = useState(false);

  const [thumb, setThumb] = useState(null);
  const [heaven, setHeaven] = useState(null);
  const [qm, setQM] = useState(null);

  const [mates, setMates] = useState(() =>
    Object.fromEntries(PLAYERS.map(p => [p, []]))
  );

  const [selectMode, setSelectMode] = useState(null); // {type, leader}
  const [showMenu, setShowMenu] = useState(false);
  const [showLinks, setShowLinks] = useState(false);

  const [beers, setBeers] = useState(
    Object.fromEntries(PLAYERS.map(p => [p, 0]))
  );

  const cardsLeft = deck.length;
  const current = PLAYERS[turn];

  const incoming = useMemo(() => {
    const map = Object.fromEntries(PLAYERS.map(p => [p, null]));
    for (const p of PLAYERS) {
      for (const m of mates[p]) if (!map[m]) map[m] = p;
    }
    return map;
  }, [mates]);

  function drink(p) {
    setBeers(prev => {
      const next = { ...prev };
      const seen = new Set();
      const dfs = x => {
        if (seen.has(x)) return;
        seen.add(x);
        next[x]++;
        mates[x].forEach(dfs);
      };
      dfs(p);
      return next;
    });
  }

  function draw() {
    if (drawing || selectMode || cardsLeft === 0) return;
    setDrawing(true);
    setDeck(d => {
      const [c, ...rest] = d;
      const r = rankOf(c);
      setCard(c);

      if (r === "J") setThumb(current);
      if (r === "7") setHeaven(current);
      if (r === "Q") setQM(current);
      if (r === "8") setSelectMode({ type: "mate", leader: current });

      setTurn(t => (t + 1) % PLAYERS.length);
      return rest;
    });
    setTimeout(() => setDrawing(false), 300);
  }

  function addMate(leader, mate) {
    if (leader === mate) return;
    setMates(m => ({
      ...m,
      [leader]: [...m[leader], mate]
    }));
    setSelectMode(null);
  }

  return (
    <div className="app">
      <h1>KAD Kings</h1>

      {/* CARD STACK */}
      <div className="stack-wrap" onClick={draw}>
        <div className="stack-back" />
        <div className="stack-card">
          <div className="card-face">{card ?? ""}</div>
          <div className="card-meta">{cardsLeft} left</div>
        </div>
      </div>

      {/* INFO STRIP */}
      <div className="info-strip">
        <span>{current}</span>
        <span>{52 - cardsLeft}/52</span>
        <span>J {thumb ?? "—"}</span>
        <span>7 {heaven ?? "—"}</span>
        <span>Q {qm ?? "—"}</span>
      </div>

      {/* PLAYERS */}
      <div className="players">
        {PLAYERS.map(p => (
          <button
            key={p}
            className={`player ${p === current ? "active" : ""}`}
            onClick={() =>
              selectMode
                ? addMate(selectMode.leader, p)
                : drink(p)
            }
          >
            <div className="video" />
            <div className="row">
              <span className="name">{p}</span>
              <span className="count">🍺 {beers[p]}</span>
            </div>
            <div className="badges">
              {qm === p && "Q"}
              {thumb === p && "J"}
              {heaven === p && "7"}
              {mates[p].length > 0 && "🤝"}
              {incoming[p] && "↳"}
            </div>
          </button>
        ))}
      </div>

      {/* ACTION BAR */}
      <div className="action-bar">
        <button onClick={() => setShowMenu(true)}>⋯</button>
        <button onClick={() => window.location.reload()}>Reset</button>
      </div>

      {/* MENU */}
      {showMenu && (
        <div className="overlay">
          <div className="menu">
            <button onClick={() => setShowLinks(true)}>Show Links</button>
            <button onClick={() => setShowMenu(false)}>Close</button>
          </div>
        </div>
      )}

      {/* LINKS */}
      {showLinks && (
        <div className="overlay">
          <div className="menu">
            {PLAYERS.map(p =>
              mates[p].length ? (
                <div key={p}>{p} → {mates[p].join(", ")}</div>
              ) : null
            )}
            <button onClick={() => setShowLinks(false)}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
