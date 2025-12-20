import { useState, useMemo } from "react";
import "./styles.css";

const PLAYERS = ["Beau", "Mike", "Jess", "Alex", "Emily"];

const RULES = {
  A: "Waterfall",
  2: "You",
  3: "Me",
  4: "Whores — everyone drinks",
  5: "Guys drink",
  6: "Dicks — everyone drinks",
  7: "Heaven — last to react drinks",
  8: "Mate",
  9: "Rhyme",
  10: "Categories",
  J: "Thumbmaster",
  Q: "Question Master",
  K: "Make a rule",
};

function buildDeck() {
  const suits = ["♠", "♥", "♦", "♣"];
  const ranks = Object.keys(RULES);
  const deck = [];
  ranks.forEach(r =>
    suits.forEach(s => deck.push({ rank: r, suit: s }))
  );
  return deck.sort(() => Math.random() - 0.5);
}

export default function App() {
  const [players, setPlayers] = useState(
    PLAYERS.map(name => ({ name, drinks: 0 }))
  );
  const [deck, setDeck] = useState(() => buildDeck());
  const [card, setCard] = useState(null);
  const [mode, setMode] = useState("auto");

  const drawCard = () => {
    if (!deck.length) return;
    const [next, ...rest] = deck;
    setDeck(rest);
    setCard(next);
  };

  const addDrink = idx => {
    setPlayers(p =>
      p.map((pl, i) =>
        i === idx ? { ...pl, drinks: pl.drinks + 1 } : pl
      )
    );
  };

  return (
    <div className={`app ${mode}`}>
      <header>
        <h1>KAD Kings</h1>
        <div className="mode-toggle">
          <button onClick={() => setMode("auto")}>AUTO</button>
          <button onClick={() => setMode("mobile")}>📱</button>
          <button onClick={() => setMode("desktop")}>🖥</button>
        </div>
      </header>

      <main className="table">
        {players.map((p, i) => (
          <div className="player" key={p.name}>
            <div className="avatar" />
            <div className="name">{p.name}</div>
            <div className="count">🍺 {p.drinks}</div>
            <button onClick={() => addDrink(i)}>+1 Beer</button>
          </div>
        ))}

        <div className="card-area">
          <div className="card">
            {card ? (
              <>
                <div className="rank">
                  {card.rank}
                  {card.suit}
                </div>
                <div className="rule">{RULES[card.rank]}</div>
              </>
            ) : (
              <div className="placeholder">
                Draw a card<br />No mercy
              </div>
            )}
          </div>
          <button className="draw" onClick={drawCard}>
            DRAW CARD
          </button>
          <div className="progress">
            {52 - deck.length} / 52
          </div>
        </div>
      </main>
    </div>
  );
}
