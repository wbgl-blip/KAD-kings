import { useMemo, useState } from "react";

const PLAYERS = ["Beau", "Sean", "Mike", "Emily", "Jess", "Alex", "Kyle", "Sam"];

const CARD_RULES = {
  A: ["Waterfall"],
  "2": ["Pick someone to drink"],
  "3": ["Me"],
  "4": ["Whores — Everyone drinks"],
  "5": ["Guys"],
  "6": ["Dicks — Everyone drinks"],
  "7": ["Heaven"],
  "8": ["Pick a Mate"],
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
  const [selectMate, setSelectMate] = useState(null);
  const [selectDrink, setSelectDrink] = useState(null);

  const [drinkPulse, setDrinkPulse] = useState(null);

  const [beers, setBeers] = useState(
    Object.fromEntries(PLAYERS.map(p => [p, 0]))
  );

  const [mates, setMates] = useState(
    Object.fromEntries(PLAYERS.map(p => [p, []]))
  );

  const current = PLAYERS[turn];
  const currentRank = card ? rankOf(card) : null;
  const cardRules = currentRank ? CARD_RULES[currentRank] : [];

  function drink(name) {
    setBeers(b => ({ ...b, [name]: b[name] + 1 }));
    setDrinkPulse(name);

    // Mate propagation (directed)
    (mates[name] || []).forEach(m => {
      setBeers(b => ({ ...b, [m]: b[m] + 1 }));
      setDrinkPulse(m);
    });

    setTimeout(() => setDrinkPulse(null), 5000);
  }

  function draw() {
    if (drawing || reaction || selectMate || selectDrink || deck.length === 0) return;
    setDrawing(true);

    setDeck(d => {
      const [c, ...rest] = d;
      const r = rankOf(c);
      setCard(c);

      if (r === "J") setThumb(current);
      if (r === "7") setHeaven(current);
      if (r === "Q") setQueen(current);
      if (r === "8") setSelectMate(current);
      if (r === "2") setSelectDrink(current);

      setTurn(t => (t + 1) % PLAYERS.length);
      return rest;
    });

    setTimeout(() => setDrawing(false), 250);
  }

  function startReaction(type) {
    // Holder taps ONCE to start, not included in reaction
    setReaction({
      type,
      reacted: new Set([type === "J" ? thumb : heaven])
    });
  }

  function tapPlayer(name) {

    // 1️⃣ Pick someone to drink (2)
    if (selectDrink) {
      if (name !== selectDrink) drink(name);
      setSelectDrink(null);
      return;
    }

    // 2️⃣ Pick a mate (8) — additive
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

    // 3️⃣ Reaction mode
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

    // 4️⃣ Start reaction (holder taps once)
    if (name === thumb) {
      startReaction("J");
      return;
    }

    if (name === heaven) {
      startReaction("7");
      return;
    }

    // 5️⃣ Normal drink
    drink(name);
  }

  const mateChains = useMemo(() => {
    const chains = [];
    function walk(start, path) {
      (mates[start] || []).forEach(n => {
        chains.push([...path, n]);
        walk(n, [...path, n]);
      });
    }
    Object.keys(mates).forEach(p => walk(p, [p]));
    return chains;
  }, [mates]);

  return (
    <div className="app">
      <h1>KAD Kings</h1>

      <div className="mode-banner">
        {selectMate && <>🤝 {selectMate} — PICK A MATE</>}
        {selectDrink && <>👉 {selectDrink} — PICK SOMEONE TO DRINK</>}
        {!selectMate && !selectDrink && reaction && <>⚡ REACTION — TAP FAST</>}
        {!selectMate && !selectDrink && !reaction && <>{current}’s Turn</>}
      </div>

      <div className="info-panel">
        <div className="info-row"><span>Turn</span><strong>{current}</strong></div>
        <div className="info-row"><span>Deck</span><strong>{52 - deck.length}/52</strong></div>
        <div className="info-row"><span>J</span><strong>{thumb ?? "—"}</strong></div>
        <div className="info-row"><span>7</span><strong>{heaven ?? "—"}</strong></div>
        <div className="info-row"><span>Q</span><strong>{queen ?? "—"}</strong></div>

        {mateChains.length > 0 && (
          <>
            <div className="info-divider" />
            {mateChains.map((c, i) => (
              <div key={i} className="mate-chain">🤝 {c.join(" → ")}</div>
            ))}
          </>
        )}
      </div>

      <div className="card-wrap" onClick={draw}>
        <div className="card">
          <div className="card-face">{card ?? "—"}</div>
          {cardRules.map((r, i) => (
            <div key={i} className="card-rule">{r}</div>
          ))}
        </div>
      </div>

      <div className="players">
        {PLAYERS.map(p => {
          const isTurn = p === current && !selectMate && !selectDrink && !reaction;
          const selectable =
            (selectMate && p !== selectMate) ||
            (selectDrink && p !== selectDrink);

          return (
            <button
              key={p}
              className={`player ${isTurn ? "active" : ""} ${selectable ? "selectable" : ""}`}
              onClick={() => tapPlayer(p)}
            >
              {isTurn && <div className="turn-badge">YOUR TURN</div>}
              <div className="name">{p}</div>
              <div className="count">🍺 {beers[p]}</div>

              <div className="roles">
                {p === thumb && <span className="role j">J</span>}
                {p === heaven && <span className="role h">7</span>}
                {p === queen && <span className="role q">Q</span>}
              </div>

              {drinkPulse === p && (
                <div className="drink-pulse">YOU DRINK 🍺</div>
              )}
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
