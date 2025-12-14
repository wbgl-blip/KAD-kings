import { useState, useEffect, useRef } from "react";
import "./App.css";

const SUITS = ["♠", "♥", "♦", "♣"];
const VALUES = ["A","2","3","4","5","6","7","8","9","10","J","Q","K"];

const RULES = {
  A: "Waterfall. Don’t be a coward.",
  2: "You drink. Easy.",
  3: "Me. Suffer.",
  4: "Whores. All drink.",
  5: "Guys drink.",
  6: "Chicks drink.",
  7: "Heaven. Last one drinks.",
  8: "Mate. Drag someone down with you.",
  9: "Rhyme. First to choke drinks.",
  10: "Categories. Pick your poison.",
  J: "Thumb Master. Control the table.",
  Q: "Questions. Answer and suffer.",
  K: "King. Pour it in. Hope you survive."
};

const SHIT_TALK = [
  "Barely drinking. Are you even trying?",
  "That beer is getting warm, hero.",
  "Everyone else is playing Kings. You’re playing chess.",
  "Hydration king over here.",
  "If sipping was an Olympic sport, you’d still lose."
];

function buildDeck() {
  const deck = [];
  VALUES.forEach(v => {
    SUITS.forEach(s => {
      deck.push({ value: v, suit: s });
    });
  });
  return deck.sort(() => Math.random() - 0.5);
}

export default function App() {
  const [players, setPlayers] = useState([
    { name: "dt", beers: 0 },
    { name: "vh", beers: 0 },
    { name: "rf", beers: 0 },
    { name: "fff", beers: 0 }
  ]);

  const [activePlayer, setActivePlayer] = useState(0);
  const [deck, setDeck] = useState(buildDeck());
  const [card, setCard] = useState(null);
  const [gameOver, setGameOver] = useState(false);

  const railRef = useRef(null);

  useEffect(() => {
    if (railRef.current) {
      const el = railRef.current.children[activePlayer];
      el?.scrollIntoView({ behavior: "smooth", inline: "center" });
    }
  }, [activePlayer]);

  const drawCard = () => {
    if (deck.length === 0) {
      setGameOver(true);
      return;
    }
    const next = deck[0];
    setDeck(d => d.slice(1));
    setCard(next);
    setActivePlayer(i => (i + 1) % players.length);
  };

  const adjustBeer = (index, delta) => {
    setPlayers(p =>
      p.map((pl, i) =>
        i === index
          ? { ...pl, beers: Math.max(0, pl.beers + delta) }
          : pl
      )
    );
  };

  const medals = [...players]
    .sort((a, b) => b.beers - a.beers)
    .map((p, i) => {
      if (i === 0) return { ...p, medal: "🥇 Gold Degenerate" };
      if (i === 1) return { ...p, medal: "🥈 Functional Alcoholic" };
      if (i === 2) return { ...p, medal: "🥉 Social Drinker" };
      return { ...p, medal: "🧃 Liability" };
    });

  return (
    <div className="app">
      <h1>KAD Kings</h1>

      {/* Players */}
      <div className="player-rail" ref={railRef}>
        {players.map((p, i) => (
          <div
            key={i}
            className={`player-card ${i === activePlayer ? "active" : ""}`}
          >
            <div className="name">{p.name}</div>
            <div className="controls">
              <button onClick={() => adjustBeer(i, -1)}>-</button>
              <span>🍺 {p.beers}</span>
              <button onClick={() => adjustBeer(i, 1)}>+</button>
            </div>
          </div>
        ))}
      </div>

      {/* Card */}
      {card && (
        <div className="card">
          <div className="top">
            {card.value} {card.suit}
          </div>
          <div className="center">{card.suit}</div>
          <div className="rule">{RULES[card.value]}</div>
          <div className="bottom">
            {card.value} {card.suit}
          </div>
        </div>
      )}

      {/* Draw */}
      {!gameOver && (
        <>
          <button className="draw" onClick={drawCard}>
            Draw Card
          </button>
          <div className="deck-count">Cards left: {deck.length}</div>
        </>
      )}

      {/* End Game */}
      {gameOver && (
        <div className="endgame">
          <h2>Game Over</h2>

          {medals.map((p, i) => (
            <div key={i} className="score-row">
              <span>{p.medal}</span>
              <span>{p.name}</span>
              <span>{p.beers} 🍺</span>
            </div>
          ))}

          <div className="shit-talk">
            {
              SHIT_TALK[
                Math.floor(Math.random() * SHIT_TALK.length)
              ]
            }
          </div>

          <button
            className="draw"
            onClick={() => {
              setDeck(buildDeck());
              setCard(null);
              setGameOver(false);
              setActivePlayer(0);
              setPlayers(p => p.map(pl => ({ ...pl, beers: 0 })));
            }}
          >
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
