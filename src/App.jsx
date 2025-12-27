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

  const [beers, setBeers] = useState(
    Object.fromEntries(PLAYERS.map(p => [p, 0]))
  );

  const [hostMode, setHostMode] = useState(false);
  const [waterfall, setWaterfall] = useState(false);

  const [smoko, setSmoko] = useState(null);
  const [smokoCount, setSmokoCount] = useState(
    Object.fromEntries(PLAYERS.map(p => [p, 2]))
  );

  const current = PLAYERS[turn];

  function drink(name) {
    setBeers(b => ({ ...b, [name]: b[name] + 1 }));
  }

  function draw() {
    if (smoko || waterfall || deck.length === 0) return;

    setDeck(d => {
      const [c, ...rest] = d;
      setCard(c);

      if (rankOf(c) === "A") {
        setWaterfall(true);
      }

      setTurn(t => (t + 1) % PLAYERS.length);
      return rest;
    });
  }

  function tapPlayer(name) {
    if (smoko || waterfall) return;

    // HOST MODE
    if (hostMode) {
      drink(name);
      return;
    }

    drink(name);
  }

  function startSmoko(player) {
    if (smoko || smokoCount[player] === 0) return;

    setSmoko(player);
    setSmokoCount(c => ({
      ...c,
      [player]: c[player] - 1
    }));
  }

  function endSmoko() {
    setSmoko(null);
  }

  return (
    <div className="app">
      <h1>KAD Kings</h1>

      {smoko && (
        <div className="overlay">
          ☕ {smoko} CALLED SMOKO
          <button onClick={endSmoko}>Resume</button>
        </div>
      )}

      {waterfall && (
        <div className="overlay">
          🌊 WATERFALL
          <button onClick={() => setWaterfall(false)}>End</button>
        </div>
      )}

      <div className="controls">
        <button onClick={() => setHostMode(h => !h)}>
          {hostMode ? "HOST MODE ON" : "HOST MODE"}
        </button>

        <button onClick={() => setWaterfall(true)}>
          START WATERFALL
        </button>
      </div>

      <div className="card" onClick={draw}>
        {card ?? "DRAW"}
      </div>

      <div className="players">
        {PLAYERS.map(p => (
          <button key={p} className="player" onClick={() => tapPlayer(p)}>
            <div className="name">{p}</div>
            <div>🍺 {beers[p]}</div>
            <button
              className="smoko"
              disabled={smokoCount[p] === 0 || smoko}
              onClick={e => {
                e.stopPropagation();
                startSmoko(p);
              }}
            >
              SMOKO ({smokoCount[p]})
            </button>
          </button>
        ))}
      </div>
    </div>
  );
}

