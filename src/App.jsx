import { useMemo, useState } from "react";

const PLAYERS = ["Beau", "Sean", "Mike", "Emily", "Jess", "Alex", "Kyle", "Sam"];

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
  const [drawing, setDrawing] = useState(false);

  const [thumb, setThumb] = useState(null);   // J
  const [heaven, setHeaven] = useState(null); // 7
  const [queen, setQueen] = useState(null);   // Q (info only)

  const [reaction, setReaction] = useState(null); // { type: "J"|"7", reacted:Set }
  const [beers, setBeers] = useState(
    Object.fromEntries(PLAYERS.map(p => [p, 0]))
  );

  const cardsLeft = deck.length;
  const current = PLAYERS[turn];

  function drink(name) {
    setBeers(b => ({ ...b, [name]: b[name] + 1 }));
  }

  function draw() {
    if (drawing || reaction || cardsLeft === 0) return;
    setDrawing(true);
    setDeck(d => {
      const [c, ...rest] = d;
      const r = rankOf(c);
      setCard(c);

      if (r === "J") setThumb(current);
      if (r === "7") setHeaven(current);
      if (r === "Q") setQueen(current);

      setTurn(t => (t + 1) % PLAYERS.length);
      return rest;
    });
    setTimeout(() => setDrawing(false), 300);
  }

  function startReaction(type) {
    setReaction({ type, reacted: new Set() });
  }

  function tapPlayer(name) {
    if (reaction) {
      if (reaction.reacted.has(name)) return;
      const next = new Set(reaction.reacted);
      next.add(name);
      if (next.size === PLAYERS.length) {
        // last to tap drinks
        drink(name);
        setReaction(null);
      } else {
        setReaction({ ...reaction, reacted: next });
      }
      return;
    }

    // Trigger powers by tapping YOUR OWN TILE
    if (name === thumb && !reaction) {
      startReaction("J");
      return;
    }
    if (name === heaven && !reaction) {
      startReaction("7");
      return;
    }

    // Normal drink
    drink(name);
  }

  return (
    <div className="app">
      <h1>KAD Kings</h1>

      {/* STAGE */}
      <div className="stage">
        {/* INFO PANEL */}
        <div className="info">
          <div className="info-row"><span className="label">Turn</span><span>{current}</span></div>
          <div className="info-row"><span className="label">Deck</span><span>{52 - cardsLeft}/52</span></div>

          <div className="divider" />

          <div className="info-row"><span className="badge j">J</span><span>{thumb ?? "—"}</span></div>
          <div className="info-row"><span className="badge h">7</span><span>{heaven ?? "—"}</span></div>
          <div className="info-row"><span className="badge q">Q</span><span>{queen ?? "—"}</span></div>
        </div>

        {/* CARD */}
        <div className="card-wrap" onClick={draw}>
          <div className="card">
            <div className="card-face">{card ?? ""}</div>
            <div className="card-meta">{cardsLeft} left</div>
          </div>
        </div>
      </div>

      {/* PLAYERS */}
      <div className="players">
        {PLAYERS.map(p => (
          <button
            key={p}
            className={`player ${p === current ? "active" : ""}`}
            onClick={() => tapPlayer(p)}
          >
            <div className="video" />
            <div className="row">
              <span className="name">{p}</span>
              <span className="count">🍺 {beers[p]}</span>
            </div>
            <div className="roles">
              {p === thumb && <span className="role j">J</span>}
              {p === heaven && <span className="role h">7</span>}
              {p === queen && <span className="role q">Q</span>}
            </div>
            {reaction && <div className="tap">TAP</div>}
          </button>
        ))}
      </div>

      {/* ACTION BAR */}
      <div className="action">
        <button onClick={() => window.location.reload()}>Reset</button>
      </div>
    </div>
  );
}
