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

  // reaction = { type, owner, reacted:Set }
  const [reaction, setReaction] = useState(null);

  const [beers, setBeers] = useState(
    Object.fromEntries(PLAYERS.map(p => [p, 0]))
  );

  // Directed mate graph: A -> [B, C]
  const [mates, setMates] = useState(
    Object.fromEntries(PLAYERS.map(p => [p, []]))
  );
  const [selectMate, setSelectMate] = useState(null);

  const cardsLeft = deck.length;
  const current = PLAYERS[turn];
  const currentRank = card ? rankOf(card) : null;
  const cardRules = currentRank ? CARD_RULES[currentRank] : [];

  /* -------------------------------------------------- */
  /* 🍺 DRINK WITH TRUE CASCADING PROPAGATION            */
  /* -------------------------------------------------- */

  function drinkCascade(start) {
    const visited = new Set();

    function walk(player) {
      if (visited.has(player)) return;
      visited.add(player);

      setBeers(b => ({
        ...b,
        [player]: b[player] + 1,
      }));

      (mates[player] || []).forEach(walk);
    }

    walk(start);
  }

  /* -------------------------------------------------- */

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

    setTimeout(() => setDrawing(false), 250);
  }

  function startReaction(type, owner) {
    if (reaction) return;
    setReaction({
      type,
      owner,
      reacted: new Set(),
    });
  }

  /* -------------------------------------------------- */
  /* 👆 TAP HANDLER — SINGLE SOURCE OF TRUTH             */
  /* -------------------------------------------------- */

  function tapPlayer(name) {
    // 1️⃣ Mate selection (modal)
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

    // 2️⃣ Reaction in progress (owner excluded)
    if (reaction) {
      if (name === reaction.owner) return;
      if (reaction.reacted.has(name)) return;

      const next = new Set(reaction.reacted);
      next.add(name);

      const racers = PLAYERS.filter(p => p !== reaction.owner);

      if (next.size === racers.length) {
        // last non-owner drinks → cascade correctly
        drinkCascade(name);
        setReaction(null);
      } else {
        setReaction({ ...reaction, reacted: next });
      }
      return;
    }

    // 3️⃣ Trigger powers (holder taps self)
    if (name === thumb) {
      startReaction("J", name);
      return;
    }

    if (name === heaven) {
      startReaction("7", name);
      return;
    }

    // 4️⃣ Normal drink → cascade
    drinkCascade(name);
  }

  /* -------------------------------------------------- */
  /* 🔗 MATE CHAINS (INFO ONLY, NOT OWNERSHIP)          */
  /* -------------------------------------------------- */

  const mateChains = useMemo(() => {
    const chains = [];

    function dfs(node, path) {
      const next = mates[node] || [];
      if (!next.length) {
        chains.push(path);
      } else {
        next.forEach(n => dfs(n, [...path, n]));
      }
    }

    Object.keys(mates).forEach(p => {
      if (mates[p].length) dfs(p, [p]);
    });

    return chains;
  }, [mates]);

  /* -------------------------------------------------- */

  return (
    <div className="app">
      <h1>KAD Kings</h1>

      <div className="stage">
        <div className="info">
          <div className="info-row"><span>Turn</span><span>{current}</span></div>
          <div className="info-row"><span>Deck</span><span>{52 - cardsLeft}/52</span></div>

          <div className="divider" />

          <div className="info-row"><span>J</span><span>{thumb ?? "—"}</span></div>
          <div className="info-row"><span>7</span><span>{heaven ?? "—"}</span></div>
          <div className="info-row"><span>Q</span><span>{queen ?? "—"}</span></div>

          {mateChains.length > 0 && (
            <>
              <div className="divider" />
              {mateChains.map((c, i) => (
                <div key={i} className="info-row">
                  🤝 {c.join(" → ")}
                </div>
              ))}
            </>
          )}
        </div>

        <div className="card-wrap" onClick={draw}>
          <div className="card">
            <div className="card-face">{card ?? ""}</div>
            {cardRules.map((line, i) => (
              <div key={i} className="card-rule">{line}</div>
            ))}
          </div>
        </div>
      </div>

      <div className="players">
        {PLAYERS.map(p => (
          <button
            key={p}
            className={`player ${p === current ? "active" : ""}`}
            onClick={() => tapPlayer(p)}
          >
            <div className="video" />
            <div className="row">
              <span>{p}</span>
              <span>🍺 {beers[p]}</span>
            </div>
            <div className="roles">
              {p === thumb && <span>J</span>}
              {p === heaven && <span>7</span>}
              {p === queen && <span>Q</span>}
            </div>
            {(reaction || selectMate) && <div className="tap">TAP</div>}
          </button>
        ))}
      </div>

      <div className="action">
        <button onClick={() => window.location.reload()}>Reset</button>
      </div>
    </div>
  );
}
