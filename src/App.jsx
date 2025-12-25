import { useMemo, useState } from "react";

const PLAYERS = ["Beau", "Sean", "Mike", "Emily", "Jess", "Alex", "Kyle", "Sam"];

const CARD_RULES = {
  A: ["Waterfall"],
  "2": ["You"],
  "3": ["Me"],
  "4": ["Whores", "Everyone drinks"],
  "5": ["Guys"],
  "6": ["Dicks", "Everyone drinks"],
  "7": ["Heaven"],
  "8": ["Pick a Mate", "They drink when you drink"],
  "9": ["Rhyme"],
  "10": ["Categories"],
  J: ["Thumbmaster"],
  Q: ["Question Master"],
  K: ["Make a Rule"],
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
  const [drawing, setDrawing] = useState(false);

  const [thumb, setThumb] = useState(null);
  const [heaven, setHeaven] = useState(null);
  const [queen, setQueen] = useState(null);

  const [reaction, setReaction] = useState(null);
  const [beers, setBeers] = useState(
    Object.fromEntries(PLAYERS.map(p => [p, 0]))
  );

  // MATES (directed)
  const [mates, setMates] = useState(
    Object.fromEntries(PLAYERS.map(p => [p, []]))
  );
  const [selectMate, setSelectMate] = useState(null); // leader name

  const cardsLeft = deck.length;
  const current = PLAYERS[turn];
  const currentRank = card ? rankOf(card) : null;
  const cardRules = currentRank ? CARD_RULES[currentRank] : [];

  function drink(name) {
    setBeers(b => ({ ...b, [name]: b[name] + 1 }));
  }

  function draw() {
    if (drawing || reaction || selectMate || cardsLeft === 0) return;
    setDrawing(true);
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
    setTimeout(() => setDrawing(false), 280);
  }

  function startReaction(type) {
    setReaction({ type, reacted: new Set() });
  }

  function tapPlayer(name) {
  // 🔒 1. MATE SELECTION — ABSOLUTE PRIORITY
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

  // 🔒 2. REACTION MODE (J / 7 ACTIVE)
  if (reaction) {
    if (reaction.reacted.has(name)) return;

    const next = new Set(reaction.reacted);
    next.add(name);

    if (next.size === PLAYERS.length) {
      drink(name);
      setReaction(null);
    } else {
      setReaction({ ...reaction, reacted: next });
    }
    return;
  }

  // 🔒 3. TRIGGER POWERS (TAP YOURSELF ONLY)
  if (name === thumb) {
    startReaction("J");
    return;
  }

  if (name === heaven) {
    startReaction("7");
    return;
  }

  // 🔒 4. NORMAL DRINK
  drink(name);
  }

    // Reaction mode
    if (reaction) {
      if (reaction.reacted.has(name)) return;
      const next = new Set(reaction.reacted);
      next.add(name);
      if (next.size === PLAYERS.length) {
        drink(name);
        setReaction(null);
      } else {
        setReaction({ ...reaction, reacted: next });
      }
      return;
    }

    // Trigger J / 7 by tapping your own tile
    if (name === thumb) return startReaction("J");
    if (name === heaven) return startReaction("7");

    drink(name);
  }

  // Build mate chains for info panel
  const mateChains = useMemo(() => {
    const chains = [];
    const visited = new Set();

    function dfs(start, node, path) {
      if (visited.has(node)) return;
      visited.add(node);
      const next = mates[node] || [];
      if (next.length === 0) {
        chains.push(path);
      } else {
        next.forEach(n => dfs(start, n, [...path, n]));
      }
    }

    Object.keys(mates).forEach(p => {
      if (mates[p].length) dfs(p, p, [p]);
    });

    return chains;
  }, [mates]);

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

          {mateChains.length > 0 && (
            <>
              <div className="divider" />
              {mateChains.map((c, i) => (
                <div key={i} className="info-row chain">
                  🤝 {c.join(" → ")}
                </div>
              ))}
            </>
          )}
        </div>

        {/* CARD */}
        <div className="card-wrap" onClick={draw}>
          <div className="card">
            <div className="card-face">{card ?? ""}</div>
            {cardRules.map((line, i) => (
              <div key={i} className="card-rule">{line}</div>
            ))}
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
            {(reaction || selectMate) && <div className="tap">TAP</div>}
          </button>
        ))}
      </div>

      {/* ACTION */}
      <div className="action">
        <button onClick={() => window.location.reload()}>Reset</button>
      </div>
    </div>
  );
}
