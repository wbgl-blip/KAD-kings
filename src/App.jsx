import { useMemo, useState } from "react";
import "./styles.css";

const PLAYERS = ["Beau", "Sean", "Mike", "Emily", "Jess", "Alex", "Kyle", "Sam"];

const CARD_RULES = {
  A: "Waterfall",
  "2": "Pick Someone to Drink",
  "3": "Me",
  "4": "Whores (All Drink)",
  "5": "Guys",
  "6": "Dicks (All Drink)",
  "7": "Heaven",
  "8": "Pick a Mate",
  "9": "Rhyme",
  "10": "Categories",
  J: "Thumbmaster",
  Q: "Question Master",
  K: "Make a Rule",
};

function buildDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const ranks = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];
  const deck = [];
  for (const r of ranks) for (const s of suits) deck.push(`${r}${s}`);
  return deck.sort(() => Math.random() - 0.5);
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
  const [pickDrink, setPickDrink] = useState(null);

  const [drinkPulse, setDrinkPulse] = useState(null);

  const [beers, setBeers] = useState(
    Object.fromEntries(PLAYERS.map(p => [p, 0]))
  );

  const [mates, setMates] = useState(
    Object.fromEntries(PLAYERS.map(p => [p, []]))
  );

  const current = PLAYERS[turn];
  const rank = card ? rankOf(card) : null;

  function drink(name) {
    setBeers(b => ({ ...b, [name]: b[name] + 1 }));
    setDrinkPulse(name);
    setTimeout(() => setDrinkPulse(null), 5000);

    // Mate propagation
    mates[name]?.forEach(m => drink(m));
  }

  function draw() {
    if (reaction || selectMate || pickDrink) return;
    if (!deck.length) return;

    const [c, ...rest] = deck;
    const r = rankOf(c);
    setCard(c);

    if (r === "J") setThumb(current);
    if (r === "7") setHeaven(current);
    if (r === "Q") setQueen(current);
    if (r === "8") setSelectMate(current);
    if (r === "2") setPickDrink(current);

    setTurn(t => (t + 1) % PLAYERS.length);
    setDeck(rest);
  }

  function startReaction(type) {
    setReaction({ type, reacted: new Set() });
  }

  function tapPlayer(name) {
    // 1️⃣ Mate selection (absolute)
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

    // 2️⃣ Pick someone to drink (2)
    if (pickDrink) {
      if (name !== pickDrink) drink(name);
      setPickDrink(null);
      return;
    }

    // 3️⃣ Reaction mode (J / 7)
    if (reaction) {
      if (reaction.reacted.has(name)) return;

      const next = new Set(reaction.reacted);
      next.add(name);

      // holder is NOT included
      if (next.size === PLAYERS.length - 1) {
        drink(name);
        setReaction(null);
      } else {
        setReaction({ ...reaction, reacted: next });
      }
      return;
    }

    // 4️⃣ Start reaction (holder taps once)
    if (name === thumb && !reaction) {
      startReaction("J");
      return;
    }
    if (name === heaven && !reaction) {
      startReaction("7");
      return;
    }

    // 5️⃣ Normal drink
    drink(name);
  }

  const mateChains = useMemo(() => {
    const chains = [];
    const walk = (node, path) => {
      if (!mates[node]?.length) {
        chains.push(path);
        return;
      }
      mates[node].forEach(n => walk(n, [...path, n]));
    };
    Object.keys(mates).forEach(p => mates[p].length && walk(p, [p]));
    return chains;
  }, [mates]);

  return (
    <div className="app">
      <h1>KAD Kings</h1>
      <h2>{current}’s Turn</h2>

      <div className="card" onClick={draw}>
        {card ? (
          <>
            <div>{card}</div>
            <small>{CARD_RULES[rank]}</small>
          </>
        ) : "Tap Card to Draw"}
      </div>

      <div className="players">
        {PLAYERS.map(p => (
          <div
            key={p}
            className={`player
              ${p === current ? "current" : ""}
              ${drinkPulse === p ? "drink-pulse" : ""}`}
            onClick={() => tapPlayer(p)}
          >
            <div className="name">{p}</div>
            <div className="count">🍺 {beers[p]}</div>

            {selectMate && <div className="hint">Pick Mate</div>}
            {pickDrink && <div className="hint">Pick to Drink</div>}
          </div>
        ))}
      </div>

      {mateChains.length > 0 && (
        <div className="chains">
          {mateChains.map((c, i) => (
            <div key={i}>🤝 {c.join(" → ")}</div>
          ))}
        </div>
      )}

      <button className="reset" onClick={() => window.location.reload()}>
        Reset
      </button>
    </div>
  );
}
